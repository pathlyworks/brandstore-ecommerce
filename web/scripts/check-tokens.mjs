/**
 * Brand tokens only: fails when a component uses a colour that is not a brand token. Tailwind's default
 * palette is removed in src/styles/theme.css (`--color-*: initial`), so `bg-blue-500` compiles to nothing;
 * this check also catches what Tailwind would still accept: arbitrary values (`bg-[#2563eb]`,
 * `text-[rgb(…)]`), raw colours in class strings or style props, and default-palette class names.
 *   node scripts/check-tokens.mjs        (part of `npm run lint`)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../src', import.meta.url).pathname;
const SKIP = ['styles/theme.css'];
const RULES = [
  [
    /\b[a-z-]+-\[(#|rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color)[^\]]*\]/g,
    'arbitrary colour value',
  ],
  [
    /\b(bg|text|border|ring|outline|fill|stroke|decoration|accent|caret|divide|placeholder|from|via|to|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black)(-\d{2,3})?\b/g,
    'Tailwind default palette (not a brand token)',
  ],
  [/#[0-9a-fA-F]{3,8}\b(?![\w-])/g, 'raw hex colour'],
  [/\b(rgb|rgba|hsl|hsla|oklch)\(/g, 'raw colour function'],
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css)$/.test(p) ? [p] : [];
  });
}

const problems = [];
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  if (SKIP.includes(rel)) continue;
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments may name colours
      for (const [re, what] of RULES) {
        for (const m of line.matchAll(re)) problems.push(`src/${rel}:${i + 1}  ${what}: ${m[0]}`);
      }
    });
}
if (problems.length) {
  console.error(`Brand tokens only — ${problems.length} problem(s):\n${problems.join('\n')}`);
  process.exit(1);
}
console.log('check-tokens: every colour is a brand token (0 arbitrary or default-palette colours)');
