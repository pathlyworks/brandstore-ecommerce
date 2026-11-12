// Static stylesheet audit: every var() resolves, and no colour / length / time
// literal appears outside the :root token block (0, 100%, 1fr and media-query
// bounds are structural and allowed). Usage: node qa/tokens.js [projectRoot]
const fs = require('fs'), path = require('path');
const root = process.argv[2] || path.resolve(__dirname, '..');
const files = fs.readdirSync(path.join(root, 'css')).filter(f => f.endsWith('.css'));
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const css = {}; files.forEach(f => css[f] = strip(fs.readFileSync(path.join(root, 'css', f), 'utf8')));
const all = Object.values(css).join('\n');
const declared = new Set([...all.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
const used = new Set([...all.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]));
const unresolved = [...used].filter(v => !declared.has(v));
console.log('custom properties declared:', declared.size, '| var() references resolved:', unresolved.length === 0 ? 'all' : 'MISSING ' + unresolved);
const literals = [];
for (const [f, t0] of Object.entries(css)) {
  let t = t0; if (f === 'base.css') t = t.replace(/:root\s*\{[^}]*\}/g, '');
  t = t.replace(/@media[^{]*\{/g, '{');
  t.split('\n').forEach((line, i) => {
    const s = line.replace(/var\([^()]*\)/g, '').replace(/--[\w-]+\s*:[^;]*;/g, m => /^--(deals-visible|grid-columns|enter-order)/.test(m) ? '' : m);
    const hits = s.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\b\d*\.?\d+(px|rem|em|ms|vw|vh|deg|ch)\b|\b[1-9]\d*\.?\d*s\b/g);
    if (hits) literals.push(`${f}:${i + 1} ${hits.join(' ')}`);
  });
}
console.log('literal colours/lengths/times outside :root:', literals.length); literals.forEach(l => console.log('  ' + l));
process.exit(unresolved.length || literals.length ? 1 : 0);
