// Point every absolute URL (canonical, Open Graph, Twitter image, sitemap, robots) at the real site.
// Run once you know where the site lives, then commit and redeploy:
//   node scripts/set-site-url.js https://your-name.netlify.app
//   node scripts/set-site-url.js https://your-user.github.io/your-repo     (GitHub Pages project site)
// It reads the current address from index.html's canonical link, so it can be re-run safely.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const target = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https:\/\/[a-z0-9.-]+(:\d+)?(\/[A-Za-z0-9._~-]+)*$/i.test(target)) {
  console.error('Usage: node scripts/set-site-url.js https://your-site.example   (https, no trailing slash needed)'); process.exit(1);
}
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const m = index.match(/<link rel="canonical" href="([^"]+?)\/?">/);
if (!m) { console.error('Could not find the canonical link in index.html'); process.exit(1); }
const current = m[1].replace(/\/+$/, '');
if (current === target) { console.log('Already set to ' + target); process.exit(0); }
let files = 0, hits = 0;
for (const f of ['index.html', 'comparison.html', 'robots.txt', 'sitemap.xml']) {
  const p = path.join(root, f); const before = fs.readFileSync(p, 'utf8'); const n = before.split(current).length - 1;
  if (n) { fs.writeFileSync(p, before.split(current).join(target)); files++; hits += n; }
}
console.log(`Replaced ${current} -> ${target} (${hits} places in ${files} files). Next: node qa/preflight.js --release`);
