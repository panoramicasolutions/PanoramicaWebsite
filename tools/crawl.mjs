// Fetches every public page from a running server (local: node tools/serve.mjs, or the live site)
// and reports status, title, H1 and primary CTA destinations. It also checks that:
//   - every page answers at its extensionless URL with 200,
//   - the old /page.html form redirects permanently to it,
//   - every redirect declared in vercel.json lands where it says,
//   - every internal link on every page resolves.
// Usage: node tools/crawl.mjs [http://localhost:8940]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] || 'http://localhost:8940').replace(/\/$/, '');

const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&pound;/g, '£').replace(/&rarr;|&larr;/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const cleanPath = (f) => (f === 'index.html' ? '/' : `/${f.replace(/\.html$/, '')}`);
// A Location header may be absolute (live) or relative (local); compare paths only.
const locPath = (h) => (h || '').replace(/^https?:\/\/[^/]+/, '').split('?')[0];

const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const declared = new Map((vercel.redirects ?? []).map((r) => [r.source, r.destination]));
const PERMANENT = new Set([301, 308]);

let failures = 0;
const fail = (msg) => { failures++; console.log('  FAIL', msg); };
const get = (p) => fetch(`${base}${p}`, { redirect: 'manual' });

const files = fs.readdirSync(root).filter((f) => f.endsWith('.html')).sort();
const linkSet = new Set();

console.log('route'.padEnd(46), 'status', 'h1'.padEnd(3), 'title / primary CTA');
for (const f of files) {
  const p = cleanPath(f);
  if (declared.has(p)) continue; // a moved page: covered by the redirect check below
  const res = await get(p);
  const html = await res.text();
  const body = strip(html);
  const h1s = [...body.matchAll(/<h1[\s>][\s\S]*?<\/h1>/gi)].length;
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || '';
  const stub = /http-equiv="refresh"/i.test(html);
  const ctas = [...body.matchAll(/<a\b[^>]*class="[^"]*btn--primary[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .filter((m) => !/header-cta/.test(m[0]) && !/nav-panel/.test(m[0]))
    .map((m) => `${text(m[2]).replace(/\(opens.*?\)/, '').trim()} -> ${m[1]}`);
  const ok = res.status === 200 && (stub || (h1s === 1 && title.length > 5));
  if (!ok) failures++;
  console.log(p.padEnd(46), String(res.status).padEnd(6), String(h1s).padEnd(3), (ok ? '' : 'FAIL ') + title.slice(0, 60) + (ctas.length ? '  |  ' + [...new Set(ctas)].join('; ').slice(0, 90) : ''));
  for (const m of body.matchAll(/\shref="([^"#]*)(#[^"]*)?"/g)) {
    const href = m[1];
    if (!href || /^(https?:|mailto:|tel:)/i.test(href) || href.includes("'")) continue;
    linkSet.add(href.startsWith('/') ? href : `/${href}`);
  }
}

console.log('\nOld .html URLs redirect permanently to the clean URL');
let legacy = 0;
for (const f of files) {
  const p = cleanPath(f);
  if (declared.has(p) || f === 'index.html') continue;
  legacy++;
  const res = await get(`/${f}`);
  if (!PERMANENT.has(res.status) || locPath(res.headers.get('location')) !== p) fail(`/${f} -> ${res.status} ${res.headers.get('location')} (expected a permanent redirect to ${p})`);
}
console.log('  checked', legacy, 'pages');

console.log('\nRedirects declared in vercel.json');
for (const [source, destination] of declared) {
  const res = await get(source);
  const good = PERMANENT.has(res.status) && locPath(res.headers.get('location')) === destination;
  console.log(' ', source.padEnd(24), String(res.status).padEnd(4), good ? `-> ${destination}` : `FAIL ${res.headers.get('location')}`);
  if (!good) failures++;
}

console.log(`\nInternal links: ${linkSet.size} unique`);
for (const l of [...linkSet].sort()) {
  const res = await get(l);
  if (res.status !== 200 && !(PERMANENT.has(res.status) && declared.has(l))) fail(`${res.status} ${l}`);
}
console.log(failures ? `\nCRAWL FAILED (${failures})` : '\nCRAWL PASSED: every page answers at its clean URL, old .html URLs and declared redirects land correctly, every internal link resolves');
process.exit(failures ? 1 : 0);
