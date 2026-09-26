// Local static server that behaves like Vercel does with this repo's vercel.json, so clean URLs
// and redirects can be tested before deploying: extensionless URLs serve the matching .html file,
// /page.html redirects (308) to /page, a trailing slash redirects to none, and every redirect
// declared in vercel.json is applied first.
// Usage: node tools/serve.mjs [port]   (default 8940)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 8940;
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const redirects = new Map((vercel.redirects ?? []).map((r) => [r.source, r]));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8'
};

const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile();

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { res.writeHead(400).end('Bad request'); return; }
  const redirect = (status, to) => { res.writeHead(status, { Location: to + url.search }).end(); };

  const declared = redirects.get(pathname);
  if (declared) return redirect(declared.statusCode ?? 308, declared.destination);

  if (vercel.cleanUrls) {
    if (pathname === '/index.html') return redirect(308, '/');
    if (pathname.endsWith('.html')) return redirect(308, pathname.slice(0, -'.html'.length));
  }
  if (vercel.trailingSlash === false && pathname.length > 1 && pathname.endsWith('/')) return redirect(308, pathname.slice(0, -1));

  const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  const file = path.join(root, rel);
  if (!file.startsWith(root)) { res.writeHead(403).end('Forbidden'); return; }

  const target = isFile(file) ? file : vercel.cleanUrls && isFile(`${file}.html`) ? `${file}.html` : null;
  if (!target) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404: not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(target).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(target).pipe(res);
}).listen(port, () => console.log(`serving ${root} on http://localhost:${port} (cleanUrls=${!!vercel.cleanUrls})`));
