// Crawler and AI-answer files, generated from the route registry and the offer data so they never drift.
//   sitemap.xml, robots.txt, llms.txt
import { routes } from './shell.mjs';
import { VISUALS, OFFER_ORDER } from './visuals.mjs';
import { loadPosts, articleFile } from './articles.mjs';

const SITE = 'https://www.panoramica.solutions';
const url = (key) => (key === 'home' ? `${SITE}/` : `${SITE}/${routes.pages[key]}`);
const articleUrl = (post) => `${SITE}/${articleFile(post)}`;

const PAGES = ['home', 'services', ...OFFER_ORDER.map((id) => routes.offers[id].page), 'diagnostic', 'insights', 'privacy', 'terms'];

export function renderSitemap() {
  const rows = PAGES.map((k) => `  <url><loc>${url(k)}</loc></url>`)
    .concat(loadPosts().map((p) => `  <url><loc>${articleUrl(p)}</loc></url>`))
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

export function renderRobots() {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
}

export function renderLlms() {
  const services = OFFER_ORDER.map((id) => {
    const o = routes.offers[id];
    return `- [${o.name}](${url(o.page)}): ${VISUALS[id].lead} ${o.price}.`;
  }).join('\n');
  const articles = loadPosts()
    .map((p) => `- [${p.title}](${articleUrl(p)}): ${p.excerpt}`)
    .join('\n');
  return `# Panoramica Solutions

> RevOps implementation for early-stage teams. AI-enabled systems built inside your stack, each with a defined scope and a clear price.

Panoramica Solutions is run by Lorenzo Liviero, a RevOps operator. Client names stay private.

## Services

${services}

## Company

- [Home](${url('home')}): What Panoramica does and who it is for.
- [Free diagnostic](${url('diagnostic')}): Seven questions and a practical first recommendation. No email required.
- [Insights](${url('insights')}): Articles on RevOps, CRM intelligence and pipeline.

## Articles

${articles}

- [Privacy](${url('privacy')})
- [Terms](${url('terms')})

## Contact

- [Book a call](${routes.external.book})
`;
}

export const SEO_FILES = { 'sitemap.xml': renderSitemap, 'robots.txt': renderRobots, 'llms.txt': renderLlms };
