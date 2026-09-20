// Re-stamps the shared header and footer into every page that has shell markers.
// Usage: node tools/sync-shell.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyShell, hasShell } from './shell.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
let stale = 0;

for (const f of fs.readdirSync(root).filter((n) => n.endsWith('.html')).sort()) {
  const p = path.join(root, f);
  const html = fs.readFileSync(p, 'utf8');
  if (!hasShell(html)) continue;
  const next = applyShell(html);
  if (next === html) continue;
  stale++;
  if (check) console.log('stale shell:', f);
  else { fs.writeFileSync(p, next); console.log('updated', f); }
}

if (check && stale) process.exit(1);
if (!stale) console.log('shell is up to date');
