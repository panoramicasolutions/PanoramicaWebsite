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
    assert.deepEqual(types, ['BreadcrumbList', 'Service', 'FAQPage'], id);
    const faq = data['@graph'][2].mainEntity;
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
    const offers = data['@graph'].find((g) => g['@type'] === 'Service').offers;
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
  const robots = read('robots.txt');
  assert.match(robots, /Sitemap: https:\/\/www\.panoramica\.solutions\/sitemap\.xml/);
  for (const agent of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
    assert.match(robots, new RegExp(`User-agent: ${agent}\\nAllow: /`), `robots.txt: ${agent} not explicitly allowed`);
  }

  const posts = JSON.parse(read('posts.json'));
  for (const post of posts) {
    assert.ok(sitemap.includes(`/${post.id}.html`), `sitemap: ${post.id}`);
    assert.ok(llms.includes(post.title), `llms.txt: ${post.title}`);
  }
});

test('the homepage carries a complete Organization entity and a matching FAQPage', () => {
  const html = read('index.html');
  const data = JSON.parse(html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)[1]);
  const org = data['@graph'].find((g) => g['@type'] === 'Organization');
  const faq = data['@graph'].find((g) => g['@type'] === 'FAQPage');
  assert.ok(org.logo && fs.existsSync(path.join(root, org.logo.replace('https://www.panoramica.solutions/', ''))), 'Organization: logo missing or not on disk');
  assert.equal(org.contactPoint.email, 'lorenzo@panoramica.solutions');
  assert.ok(org.founder.sameAs.includes(routes.external.linkedin));
  assert.ok(faq.mainEntity.length >= 4, 'homepage FAQ too short');
  for (const q of faq.mainEntity) assert.ok(html.includes(`<summary>${q.name.replace(/&/g, '&amp;')}</summary>`), `homepage: FAQ not on the page: ${q.name}`);
});

test('every real page has a social image; a page that is our own asset must exist on disk', () => {
  for (const f of fs.readdirSync(root).filter((n) => n.endsWith('.html'))) {
    const html = read(f);
    if (/http-equiv="refresh"/i.test(html)) continue; // a redirect stub carries no content of its own
    const m = html.match(/property="og:image" content="([^"]+)"/);
    assert.ok(m, `${f}: og:image missing`);
    const own = m[1].match(/^https:\/\/www\.panoramica\.solutions\/(.+)$/);
    if (own) assert.ok(fs.existsSync(path.join(root, own[1])), `${f}: ${own[1]} is missing`);
    else assert.match(m[1], /^https:\/\//, `${f}: og:image is not a valid absolute URL`);
  }
});

test('every article page is a real static page: unique meta, baked body, valid BlogPosting data', () => {
  const posts = JSON.parse(fs.readFileSync(path.join(root, 'posts.json'), 'utf8'));
  const titles = new Set();
  for (const post of posts) {
    const file = `${post.id}.html`;
    assert.ok(fs.existsSync(path.join(root, file)), `${file} was not generated`);
    const html = read(file);
    assert.ok(!/fetch\(.posts\.json.\)/.test(html), `${file}: still fetches posts.json client-side`);
    assert.ok(html.includes(`<h1 class="article-title">${post.title.replace(/&/g, '&amp;')}</h1>`), `${file}: title not baked into the body`);
    const title = (html.match(/<title>([^<]*)<\/title>/) || [])[1];
    assert.ok(title && !titles.has(title), `${file}: duplicate or missing <title>`);
    titles.add(title);
    const data = JSON.parse(html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)[1]);
    const posting = data['@graph'].find((g) => g['@type'] === 'BlogPosting');
    const breadcrumb = data['@graph'].find((g) => g['@type'] === 'BreadcrumbList');
    assert.ok(posting, `${file}: no BlogPosting in the graph`);
    assert.equal(posting.headline, post.title, file);
    assert.ok(breadcrumb && breadcrumb.itemListElement.length === 3, `${file}: breadcrumb missing or incomplete`);
  }
  // Every insights/home card links straight to the static file, not the old query-string template.
  assert.ok(!read('insights.html').includes('article.html?id='), 'insights.html still links the old template');
  assert.ok(!read('index.html').includes('article.html?id='), 'index.html still links the old template');
});

test('the old article.html is a redirect stub that forwards ?id= to the new static page', () => {
  const html = read('article.html');
  assert.match(html, /http-equiv="refresh"/);
  assert.match(html, /id \+ '\.html'/);
});
