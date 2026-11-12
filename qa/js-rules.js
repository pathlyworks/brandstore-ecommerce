// Static rules for the Task 4 brief. No browser needed.
//  1. no inline event handlers (onclick=, onchange=, ...) or javascript: URLs in the HTML
//  2. no inline <script> bodies: every script has a src
//  3. no innerHTML / outerHTML / insertAdjacentHTML / document.write in js/
//  4. every function declaration has a comment directly above it
//  5. every js/ file starts with a header comment
// Usage: node qa/js-rules.js [projectRoot]
const fs = require('fs'), path = require('path');
const root = process.argv[2] || path.resolve(__dirname, '..');
let fails = 0; const fail = (m) => { fails++; console.log('  FAIL', m); };

for (const f of fs.readdirSync(root).filter(f => f.endsWith('.html'))) {
  const html = fs.readFileSync(path.join(root, f), 'utf8');
  const handlers = html.match(/<[^>]+\son[a-z]+\s*=/gi) || [];
  const jsUrls = html.match(/href\s*=\s*["']javascript:/gi) || [];
  const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi)].filter(m => m[1].trim() !== '');
  console.log(`${f}: inline handlers ${handlers.length}, javascript: urls ${jsUrls.length}, inline script bodies ${inline.length}`);
  if (handlers.length || jsUrls.length || inline.length) fail(f);
}

let functions = 0;
for (const f of fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js'))) {
  const src = fs.readFileSync(path.join(root, 'js', f), 'utf8'); const lines = src.split('\n');
  if (!/^\s*\/\*/.test(src)) fail(`${f}: no header comment`);
  const code = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/\/\/.*$/gm, '');
  if (/\.(innerHTML|outerHTML)\b|insertAdjacentHTML|document\.write/.test(code)) fail(`${f}: forbidden HTML-string API`);
  lines.forEach((line, i) => {
    if (/^\s*function\s+\w+\s*\(/.test(line)) {
      functions++;
      let j = i - 1; while (j >= 0 && lines[j].trim() === '') j--;
      if (!/(\*\/|\/\/)\s*$/.test(lines[j] || '')) fail(`${f}:${i + 1} function without a comment above: ${line.trim()}`);
    }
  });
}
console.log(`named functions checked: ${functions}`);
console.log('FAILS:', fails); process.exit(fails ? 1 : 0);
