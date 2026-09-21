import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const routes = createRequire(import.meta.url)(path.join(root, 'assets', 'routes.js'));
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('every offer page carries valid Service and FAQPage structured data', () => {
  for (const [id, offer] of Object.entries(routes.offers)) {
    const html = read(routes.pages[offer.page]);
    const m = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
    assert.ok(m, `${id}: no JSON-LD`);
    const data = JSON.parse(m[1]);
    const types = data['@graph'].map((g) => g['@type']);
    assert.deepEqual(types, ['Service', 'FAQPage'], id);
    const faq = data['@graph'][1].mainEntity;
    assert.ok(faq.length >= 3, `${id}: FAQ too short`);
    for (const q of faq) assert.ok(q.name && q.acceptedAnswer.text, `${id}: empty question`);
    // The visible FAQ and the structured data must say the same thing.
    for (const q of faq) assert.ok(html.includes(`<summary>${q.name.replace(/&/g, '&amp;')}</summary>`), `${id}: FAQ not on the page: ${q.name}`);
  }
});

test('an offer states a structured price only when its page states that price', () => {
  for (const [id, offer] of Object.entries(routes.offers)) {
    const html = read(routes.pages[offer.page]);
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)[1]);
    const offers = data['@graph'][0].offers;
    if (/custom scope/i.test(offer.price)) assert.equal(offers, undefined, `${id}: Custom scope must not state a price`);
    else assert.ok(offers, `${id}: fixed price missing from structured data`);
  }
});

test('llms.txt and sitemap.xml list every offer page', () => {
  const llms = read('llms.txt');
  const sitemap = read('sitemap.xml');
  for (const offer of Object.values(routes.offers)) {
    assert.ok(llms.includes(offer.name), `llms.txt: ${offer.name}`);
    assert.ok(sitemap.includes(`/${routes.pages[offer.page]}`), `sitemap: ${offer.page}`);
  }
  assert.ok(sitemap.includes('/services.html'));
  assert.match(read('robots.txt'), /Sitemap: https:\/\/www\.panoramica\.solutions\/sitemap\.xml/);
});

test('every page has its own social image that exists on disk', () => {
  for (const f of fs.readdirSync(root).filter((n) => n.endsWith('.html') && n !== 'what-we-fix.html')) {
    const m = read(f).match(/property="og:image" content="https:\/\/www\.panoramica\.solutions\/([^"]+)"/);
    assert.ok(m, `${f}: og:image missing`);
    assert.ok(fs.existsSync(path.join(root, m[1])), `${f}: ${m[1]} is missing`);
  }
});
