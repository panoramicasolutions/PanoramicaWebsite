// WCAG contrast check for the design tokens declared in assets/site.css.
// Usage: node tools/contrast.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'assets', 'site.css'), 'utf8');
const tokens = Object.fromEntries([...css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map((m) => [m[1], m[2]]));

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(tokens[a]), lum(tokens[b])].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, minimum ratio, use]
const pairs = [
  ['ink', 'bg', 4.5, 'body text on page'],
  ['ink', 'surface', 4.5, 'body text on cards'],
  ['ink', 'tint', 4.5, 'body text on tinted sections'],
  ['ink-2', 'bg', 4.5, 'secondary text on page'],
  ['ink-2', 'surface', 4.5, 'secondary text on cards'],
  ['ink-2', 'tint', 4.5, 'secondary text on tint'],
  ['ink-3', 'bg', 4.5, 'muted text on page'],
  ['ink-3', 'surface', 4.5, 'muted text on cards'],
  ['ink-3', 'tint', 4.5, 'muted text on tint'],
  ['ink', 'lime', 4.5, 'button label on lime'],
  ['ink', 'lime-hover', 4.5, 'button label on lime hover'],
  ['bg', 'ink', 4.5, 'skip link and example label'],
  ['on-dark', 'dark', 4.5, 'body text on dark section'],
  ['on-dark-2', 'dark', 4.5, 'secondary text on dark section'],
  ['on-dark', 'dark-2', 4.5, 'text on dark cards'],
  ['on-dark-2', 'dark-2', 4.5, 'secondary text on dark cards'],
  ['lime', 'dark', 4.5, 'lime text on dark section'],
  ['lime', 'dark-2', 4.5, 'lime text on dark cards'],
  ['focus', 'bg', 3, 'focus ring on page'],
  ['focus', 'tint', 3, 'focus ring on tint'],
  ['lime', 'dark', 3, 'focus ring on dark section'],
  ['ink-3', 'bg', 3, 'form control borders on page'],
  ['ink', 'bg', 3, 'button border on page']
];

let failed = 0;
console.log('token'.padEnd(12), 'on'.padEnd(12), 'ratio'.padEnd(8), 'min'.padEnd(5), 'use');
for (const [fg, bg, min, use] of pairs) {
  const r = ratio(fg, bg);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(fg.padEnd(12), bg.padEnd(12), r.toFixed(2).padEnd(8), String(min).padEnd(5), (ok ? 'ok   ' : 'FAIL ') + use);
}
console.log(failed ? `FAILED: ${failed} pair(s) below threshold` : 'PASSED: all token pairs meet WCAG AA');
process.exit(failed ? 1 : 0);
