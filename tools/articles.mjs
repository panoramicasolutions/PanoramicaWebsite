// Article pages, one static file per entry in posts.json, generated whole (like tools/seo.mjs)
// rather than stamped into a hand-authored shell. Each file carries its own title, meta
// description, canonical, OG/Twitter tags and BlogPosting structured data, and the article
// body is baked straight into the HTML rather than fetched by client-side JavaScript, so a
// crawler that never runs JS (most AI crawlers, and search engines on a slow render queue)
// can still read it. Filename is the post's own id, e.g. posts.json's "goldmine-launch"
// becomes "goldmine-launch.html" at the repo root, alongside every other page.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { routes, renderHeader, renderFooter } from './shell.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://www.panoramica.solutions';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ldSafe = (o) => JSON.stringify(o, null, 2).replace(/</g, '\\u003c');

export function loadPosts() {
  const posts = JSON.parse(fs.readFileSync(path.join(root, 'posts.json'), 'utf8'));
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  return posts;
}

export const articleFile = (post) => `${post.id}.html`;
const articleUrl = (post) => `${SITE}/${articleFile(post)}`;

function renderHead(post) {
  const title = `${post.title} | Panoramica`;
  const iso = new Date(post.date).toISOString();
  const posting = {
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.image,
    datePublished: iso,
    author: { '@type': 'Person', name: 'Lorenzo Liviero', url: routes.external.linkedin },
    publisher: { '@type': 'Organization', name: 'Panoramica Solutions', url: `${SITE}/` },
    mainEntityOfPage: articleUrl(post)
  };
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: 'Insights', item: `${SITE}/${routes.pages.insights}` },
      { '@type': 'ListItem', position: 3, name: post.title, item: articleUrl(post) }
    ]
  };
  const ld = { '@context': 'https://schema.org', '@graph': [breadcrumb, posting] };
  return `<title>${esc(title)}</title>
<meta name="description" content="${esc(post.excerpt)}">
<link rel="canonical" href="${articleUrl(post)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Panoramica">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(post.excerpt)}">
<meta property="og:url" content="${articleUrl(post)}">
<meta property="og:image" content="${esc(post.image)}">
<meta property="og:image:width" content="1000">
<meta property="og:image:height" content="600">
<meta property="og:image:alt" content="${esc(post.title)}">
<meta property="article:published_time" content="${iso}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(post.image)}">
<meta name="theme-color" content="#050505">
<link rel="icon" type="image/svg+xml" href="assets/star.svg">
<link rel="preload" href="assets/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/site.css">
<script type="application/ld+json">
${ldSafe(ld)}
</script>`;
}

function renderBody(post) {
  return `<main id="main">
<article class="section">
    <div class="wrap wrap--narrow">
      <p class="crumb"><a class="text-link" href="${routes.pages.insights}">&larr; Back to insights</a></p>
      <div class="meta-row"><span>${esc(post.category)}</span><span>${esc(post.date)}</span></div>
      <h1 class="article-title">${esc(post.title)}</h1>
      <div class="article-figure"><img src="${esc(post.image)}" alt="${esc(post.title)}" width="1000" height="600" loading="lazy" decoding="async"></div>
      <div class="prose article-body">${post.content}</div>
      <div class="card card--strong article-cta">
        <h2>Not sure which workflow to fix first?</h2>
        <p class="lead">Answer a few questions and get a practical first recommendation. No email required.</p>
        <div class="btn-row">
          <a class="btn btn--primary" href="${routes.pages.diagnostic}">Run the free diagnostic</a>
        </div>
      </div>
    </div>
  </article>
</main>`;
}

export function renderArticlePage(post) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${renderHead(post)}
</head>
<body data-nav="insights">
<a class="skip-link" href="#main">Skip to content</a>
${renderHeader('insights')}
${renderBody(post)}
${renderFooter()}
<script src="assets/site.js" defer></script>
</body>
</html>
`;
}

// { filename: () => html }, same shape as tools/seo.mjs's SEO_FILES, so tools/sync-shell.mjs
// can generate both through one "compare and write if changed" loop.
export function articleFiles() {
  const out = {};
  for (const post of loadPosts()) out[articleFile(post)] = () => renderArticlePage(post);
  return out;
}
