// Renders the insights article cards from posts.json into static HTML.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Cards render at a third of the page width, so a smaller image is enough.
const cardImage = (url) => url.replace(/([?&])w=1000/, '$1w=640');

export function renderPostCards(limit = Infinity) {
  const posts = JSON.parse(fs.readFileSync(path.join(root, 'posts.json'), 'utf8'));
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  // A limited list sits under a section heading on another page, so its cards use h3.
  const h = Number.isFinite(limit) ? 'h3' : 'h2';
  const cards = posts.slice(0, limit).map((p) => `      <article class="card card--link post-card">
        <div class="post-card__img"><img src="${esc(cardImage(p.image))}" alt="" width="640" height="384" loading="lazy" decoding="async"></div>
        <div class="post-card__body">
          <div class="post-card__meta"><span>${esc(p.category)}</span><span>${esc(p.date)}</span></div>
          <${h}><a class="card__link" href="article.html?id=${encodeURIComponent(p.id)}">${esc(p.title)}</a></${h}>
          <p>${esc(p.excerpt)}</p>
        </div>
      </article>`);
  const tag = Number.isFinite(limit) ? `<!-- posts:start limit=${limit} -->` : '<!-- posts:start -->';
  return `${tag}\n${cards.join('\n')}\n      <!-- posts:end -->`;
}

const block = /<!-- posts:start(?: limit=(\d+))? -->[\s\S]*?<!-- posts:end -->/;

export function hasPosts(html) { return block.test(html); }
export function applyPosts(html) { return html.replace(block, (_all, n) => renderPostCards(n ? Number(n) : Infinity)); }
