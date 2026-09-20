// Fetches every public route from a running static server and reports status, title, H1,
// canonical and primary CTA destinations, then fetches every internal link once.
// Usage: node tools/crawl.mjs [http://localhost:8940]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.argv[2] || 'http://localhost:8940').replace(/\/$/, '');

const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html')).sort();
const posts = JSON.parse(fs.readFileSync(path.join(root, 'posts.json'), 'utf8'));
const routes = [...pages, ...posts.map((p) => `article.html?id=${p.id}`)];

const strip = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&pound;/g, '£').replace(/&rarr;|&larr;/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// Redirects declared in vercel.json are expected on the live site: source -> destination with a 301.
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const redirects = new Map((vercel.redirects ?? []).map((r) => [r.source.replace(/^\//, ''), r.destination.replace(/^\//, '')]));

let failures = 0;
const linkSet = new Set();
console.log('route'.padEnd(46), 'status', 'h1'.padEnd(3), 'title / primary CTA');
for (const r of routes) {
  const res = await fetch(`${base}/${r}`, { redirect: 'manual' });
  if (redirects.has(r) && res.status === 301) {
    const to = (res.headers.get('location') || '').replace(/^https?:\/\/[^/]+\//, '').replace(/^\//, '');
    const good = to === redirects.get(r);
    if (!good) failures++;
    console.log(r.padEnd(46), String(res.status).padEnd(6), '-   ', (good ? 'redirects to ' : 'FAIL redirects to ') + to);
    continue;
  }
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
  console.log(r.padEnd(46), String(res.status).padEnd(6), String(h1s).padEnd(3), (ok ? '' : 'FAIL ') + title.slice(0, 60) + (ctas.length ? '  |  ' + [...new Set(ctas)].join('; ').slice(0, 90) : ''));
  for (const m of body.matchAll(/\shref="([^"#]*)(#[^"]*)?"/g)) {
    const href = m[1];
    if (!href || /^(https?:|mailto:|tel:)/i.test(href) || href.includes("'")) continue;
    linkSet.add(href.replace(/^\//, ''));
  }
}

console.log(`\nInternal links: ${linkSet.size} unique`);
for (const l of [...linkSet].sort()) {
  const res = await fetch(`${base}/${l}`, { redirect: 'manual' });
  if (res.status === 301 && redirects.has(l)) continue;
  if (res.status !== 200) { failures++; console.log('  FAIL', res.status, l); }
}
console.log(failures ? `\nCRAWL FAILED (${failures})` : '\nCRAWL PASSED: every route and internal link returns 200 or its declared redirect');
process.exit(failures ? 1 : 0);
