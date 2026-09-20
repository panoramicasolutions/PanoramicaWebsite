// Static-site gate: links, anchors, redirects, page structure and copy rules.
// Usage: node tools/check-site.mjs [--strict]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
const onlyArg = process.argv.find((a) => a.startsWith('--files='));
const only = onlyArg ? onlyArg.slice(8).split(',') : null;
const routes = require(path.join(root, 'assets', 'routes.js'));

const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => (strict ? errors : warnings).push(m);

const htmlFiles = fs.readdirSync(root).filter((f) => f.endsWith('.html')).sort();
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const pages = Object.fromEntries(htmlFiles.map((f) => [f, read(f)]));

const stripBlocks = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
const visibleText = (h) => stripBlocks(h).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&pound;/g, '£').replace(/&rarr;/g, '→').replace(/&larr;/g, '←').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const idsOf = (h) => new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));

// Redirect stubs are exempt from page rules.
const isStub = (f, h) => /http-equiv="refresh"/i.test(h);

// ---------- A. links, assets, anchors ----------
for (const f of htmlFiles) {
  const html = stripBlocks(pages[f]);
  const refs = [...html.matchAll(/\s(?:href|src)="([^"]*)"/g)].map((m) => m[1]);
  for (const ref of refs) {
    if (!ref || /^(https?:|mailto:|tel:|javascript:|data:)/i.test(ref) || ref.includes("'") || ref.includes('${')) continue;
    let [target, hash] = ref.split('#');
    target = target.split('?')[0];
    let file = target === '' ? f : target.replace(/^\//, '');
    if (file === '') file = 'index.html';
    if (!fs.existsSync(path.join(root, file))) { err(`${f}: broken link -> ${ref}`); continue; }
    if (hash && file.endsWith('.html')) {
      const dest = pages[file] ?? read(file);
      if (!idsOf(dest).has(hash)) err(`${f}: missing anchor #${hash} in ${file}`);
    }
  }
}

// ---------- B. vercel.json ----------
try {
  const v = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  for (const r of v.redirects ?? []) {
    if (r.statusCode !== 301 && r.permanent !== true) err(`vercel.json: redirect ${r.source} is not permanent`);
    if (!fs.existsSync(path.join(root, r.destination.replace(/^\//, '')))) err(`vercel.json: redirect target missing ${r.destination}`);
  }
  for (const r of v.rewrites ?? []) {
    if (!fs.existsSync(path.join(root, r.destination.replace(/^\//, '')))) warn(`vercel.json: rewrite target missing ${r.destination}`);
  }
  if (!(v.redirects ?? []).some((r) => r.source === '/marketplace.html')) err('vercel.json: /marketplace.html redirect missing');
} catch (e) { err('vercel.json invalid: ' + e.message); }

// ---------- C. registry ----------
for (const [key, p] of Object.entries(routes.pages)) {
  const file = p.split('#')[0];
  if (!fs.existsSync(path.join(root, file))) warn(`routes.js: page "${key}" -> ${file} does not exist yet`);
}

// ---------- D/E. page structure and copy rules (strict) ----------
if (strict) {
  for (const f of htmlFiles) {
    const h = pages[f];
    if (isStub(f, h)) continue;
    if (only && !only.includes(f)) continue;
    const body = stripBlocks(h);
    const h1s = [...body.matchAll(/<h1[\s>][\s\S]*?<\/h1>/gi)];
    if (h1s.length !== 1) err(`${f}: expected exactly one <h1>, found ${h1s.length}`);

    if (!/<html[^>]*\slang="/i.test(h)) err(`${f}: missing lang attribute`);
    if (!/<title>[^<]{5,}<\/title>/i.test(h)) err(`${f}: missing title`);
    const dynamicMeta = f === 'article.html';
    if (!dynamicMeta) {
      if (!/<meta\s+name="description"\s+content="[^"]{40,}"/i.test(h)) err(`${f}: missing or short meta description`);
      if (!/<link\s+rel="canonical"\s+href="https:\/\/www\.panoramica\.solutions\/[^"]*"/i.test(h)) err(`${f}: missing canonical`);
    }
    for (const prop of ['og:title', 'og:description', 'og:type', 'og:site_name', 'og:image']) {
      if (!new RegExp(`property="${prop}"`).test(h)) err(`${f}: missing ${prop}`);
    }

    // heading order
    let prev = 0;
    for (const m of body.matchAll(/<h([1-6])[\s>]/gi)) {
      const lvl = Number(m[1]);
      if (prev && lvl > prev + 1) err(`${f}: heading level skips from h${prev} to h${lvl}`);
      prev = lvl;
    }
    // images need alt
    for (const m of body.matchAll(/<img\b[^>]*>/gi)) if (!/\salt=/.test(m[0])) err(`${f}: <img> without alt`);
    // links and buttons need a name
    for (const m of body.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
      const label = m[3].replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, 'x').trim();
      if (!label && !/aria-label=|aria-labelledby=/.test(m[2])) err(`${f}: <${m[1]}> without accessible name`);
    }

    // copy rules
    const text = visibleText(h);
    const legal = ['privacy.html', 'terms.html'].includes(f);
    if (!legal && /[—–]/.test(text)) err(`${f}: em or en dash in visible text`);
    for (const bad of [/lorem ipsum/i, /\bGCC\b/, /\bTODO\b/, /coming soon/i]) if (bad.test(text)) err(`${f}: banned text ${bad}`);
    for (const m of body.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
      const t = m[2].replace(/<[^>]+>/g, '').trim();
      if (t.endsWith('.') && !t.endsWith('...')) err(`${f}: heading ends with a full stop: "${t}"`);
    }
    if (/\bMarketplace\b/.test(text) && !['insights.html', 'article.html', 'privacy.html', 'terms.html'].includes(f)) {
      err(`${f}: customer-facing "Marketplace" wording`);
    }
  }
}

// ---------- G. samples must be labelled (strict) ----------
if (strict) {
  for (const f of htmlFiles) {
    const h = pages[f];
    const samples = (h.match(/class="example"/g) || []).length;
    const labels = (h.match(/<p class="example__label">Example - not client data\.<\/p>/g) || []).length;
    if (samples !== labels) err(`${f}: ${samples} sample block(s) but ${labels} correct label(s)`);
  }
}

// ---------- F. price consistency (strict) ----------
if (strict) {
  const text = (f) => visibleText(pages[f] ?? '').toLowerCase();
  for (const [key, offer] of Object.entries(routes.offers)) {
    const file = routes.pages[offer.page];
    const price = offer.price.toLowerCase();
    for (const f of [file, 'what-we-fix.html']) {
      if (!text(f).includes(price)) err(`price: "${offer.price}" (${key}) missing from ${f}`);
    }
  }
  for (const f of ['email-outreach.html', 'database.html']) {
    if (text(f).includes('£')) err(`price: ${f} is custom scope but shows a figure`);
  }
  for (const f of ['email-outreach.html', 'database.html']) {
    if (!text(f).includes('custom scope')) err(`price: ${f} does not say Custom scope`);
  }
}

const label = strict ? 'strict' : 'basic';
console.log(`check-site (${label}): ${htmlFiles.length} pages`);
for (const w of warnings) console.log('  warn ', w);
for (const e of errors) console.log('  FAIL ', e);
console.log(errors.length ? `FAILED with ${errors.length} error(s)` : 'PASSED');
process.exit(errors.length ? 1 : 0);
