// Static code rules (no browser needed). Checks the "external ES modules, small named functions,
// no inline script blobs, no global sprawl" requirement:
//  1. HTML: no inline event handlers or javascript: URLs; every <script> has a src (no inline bodies);
//     every script is type="module" (there are no classic scripts).
//  2. src/: every file is an ES module (has import or export) and starts with a header comment.
//  3. src/: no globals created: no window.X = / globalThis.X = / top-level var.
//  4. src/: no innerHTML / outerHTML / insertAdjacentHTML / document.write.
//  5. src/: every named function has a comment directly above it and is at most MAX_FUNCTION_LINES long.
// src/vendor/ (third-party code copied as published, e.g. Axios) is not checked.
// Usage: node qa/js-rules.js [projectRoot]
const fs = require('fs'), path = require('path');
const root = process.argv[2] || path.resolve(__dirname, '..');
const MAX_FUNCTION_LINES = 40;
const CLASSIC_SCRIPTS = []; // none: every script is an ES module
let fails = 0; const fail = (m) => { fails++; console.log('  FAIL', m); };

for (const f of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, f), 'utf8');
  const handlers = html.match(/<[^>]+\son[a-z]+\s*=/gi) || [];
  const jsUrls = html.match(/href\s*=\s*["']javascript:/gi) || [];
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  const inline = scripts.filter(m => !/\ssrc=/.test(m[1]) || m[2].trim() !== '');
  const classic = scripts.filter(m => !/type="module"/.test(m[1]) && !CLASSIC_SCRIPTS.some(c => m[1].includes(`src="${c}"`)));
  const modules = scripts.filter(m => /type="module"/.test(m[1])).length;
  console.log(`${f}: module scripts ${modules}, unexpected classic scripts ${classic.length}, inline handlers ${handlers.length}, javascript: urls ${jsUrls.length}, inline script bodies ${inline.length}`);
  if (handlers.length || jsUrls.length || inline.length || classic.length || modules !== 1) fail(f);
}

const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'vendor' ? [] : walk(path.join(d, e.name))) : e.name.endsWith('.js') ? [path.join(d, e.name)] : []);
let functions = 0, files = 0, longest = { lines: 0, name: '' };
for (const file of walk(path.join(root, 'src'))) {
  const f = path.relative(root, file); files++;
  const src = fs.readFileSync(file, 'utf8'); const lines = src.split('\n');
  if (!/^\s*\/\*/.test(src)) fail(`${f}: no header comment`);
  const code = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/\/\/.*$/gm, '');
  if (!CLASSIC_SCRIPTS.includes(f) && !/^\s*(import|export)\b/m.test(code)) fail(`${f}: not an ES module (no import/export)`);
  if (/\b(window|globalThis|self)\.[A-Za-z_$][\w$]*\s*=(?!=)/.test(code)) fail(`${f}: assigns a global`);
  if (/^var\s/m.test(code)) fail(`${f}: top-level var`);
  if (/\.(innerHTML|outerHTML)\b|insertAdjacentHTML|document\.write/.test(code)) fail(`${f}: forbidden HTML-string API`);
  lines.forEach((line, i) => {
    const m = /^(\s*)(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/.exec(line);
    if (!m) return;
    functions++;
    let j = i - 1; while (j >= 0 && lines[j].trim() === '') j--;
    if (!/(\*\/|\/\/.*)\s*$/.test(lines[j] || '')) fail(`${f}:${i + 1} function without a comment above: ${m[2]}`);
    const end = lines.findIndex((l, k) => k > i && l.startsWith(m[1] + '}'));
    const length = end - i + 1;
    if (length > longest.lines) longest = { lines: length, name: `${f} ${m[2]}()` };
    if (length > MAX_FUNCTION_LINES) fail(`${f}:${i + 1} ${m[2]}() is ${length} lines (max ${MAX_FUNCTION_LINES})`);
  });
}
console.log(`src files ${files}, named functions ${functions}, longest ${longest.lines} lines (${longest.name})`);
console.log('FAILS:', fails); process.exit(fails ? 1 : 0);
