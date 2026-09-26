// Crawler and AI-answer files, generated from the route registry and the offer data so they never drift.
//   sitemap.xml, robots.txt, llms.txt
import { routes } from './shell.mjs';
import { VISUALS, OFFER_ORDER } from './visuals.mjs';
import { loadPosts } from './articles.mjs';

const SITE = 'https://www.panoramica.solutions';
const url = (key) => `${SITE}${routes.href(key)}`;
const articleUrl = (post) => `${SITE}/${post.id}`;

const PAGES = ['home', 'services', ...OFFER_ORDER.map((id) => routes.offers[id].page), 'diagnostic', 'insights', 'privacy', 'terms'];

export function renderSitemap() {
  const rows = PAGES.map((k) => `  <url><loc>${url(k)}</loc></url>`)
    .concat(loadPosts().map((p) => `  <url><loc>${articleUrl(p)}</loc></url>`))
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

// Every named entry below is already covered by the blanket "User-agent: *" allow further up;
// they are listed anyway so an AI crawler checking its own name specifically sees an explicit
// yes, and so it is clear on inspection that being read by AI search and assistants is wanted,
// not an accident of an open-by-default file.
const AI_AGENTS = ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'meta-externalagent'];

export function renderRobots() {
  const named = AI_AGENTS.map((a) => `User-agent: ${a}\nAllow: /\n`).join('\n');
  return `User-agent: *\nAllow: /\n\n${named}\nSitemap: ${SITE}/sitemap.xml\n`;
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
