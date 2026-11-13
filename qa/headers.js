// Serves the site over HTTP with the headers from netlify.toml (like Netlify does) and loads every
// page under them: checks the headers arrive, that the Content-Security-Policy blocks nothing the
// site needs, that nothing logs a console error, and that the scripted features still work.
// Usage: node qa/headers.js [projectRoot]    Needs: playwright
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = process.argv[2] || path.resolve(__dirname, '..');
const toml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
const headerBlock = toml.slice(toml.indexOf('[headers.values]'));
const headers = Object.fromEntries([...headerBlock.matchAll(/^\s*([A-Za-z-]+)\s*=\s*"(.*)"\s*$/gm)].map(m => [m[1], m[2]]));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.txt': 'text/plain', '.xml': 'application/xml' };
let fails = 0; const check = (ok, msg, extra = '') => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', msg, extra); };
let api; // the mock API on /api/* (same origin, as on Netlify), loaded below
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) { req.url = req.url.slice(4); for (const [k, v] of Object.entries(headers)) res.setHeader(k, v); return api.handle(req, res); }
  let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
  let f = path.join(root, u); const known = f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile() && !u.startsWith('/.git');
  if (!known) { f = path.join(root, '404.html'); res.writeHead(404, { ...headers, 'Content-Type': types['.html'] }); return res.end(fs.readFileSync(f)); }
  res.writeHead(200, { ...headers, 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); res.end(require('./serve').fileBody(f));
});
import(require('url').pathToFileURL(path.join(root, 'mock-server', 'server.mjs')).href).then(({ createApp }) => { api = createApp({ rateLimitMax: 100000 }); server.listen(0, listening); });
async function listening() {
  const base = 'http://localhost:' + server.address().port; const b = await chromium.launch();
  for (const w of [375, 1280]) for (const pg of ['/', '/comparison.html', '/catalog.html', '/product.html?id=smartwatch', '/cart.html', '/no-such-page']) {
    const p = await b.newPage({ viewport: { width: w, height: 900 } }); const errs = [];
    p.on('console', m => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', e => errs.push(String(e)));
    await p.addInitScript(() => document.addEventListener('securitypolicyviolation', e => (window.__v = window.__v || []).push(e.violatedDirective + ' ' + e.blockedURI)));
    const r = await p.goto(base + pg); await p.waitForTimeout(500);
    const v = await p.evaluate(() => window.__v || []);
    const h = r.headers();
    check(Object.keys(headers).every(k => h[k.toLowerCase()] === headers[k]), `headers present ${pg}@${w}`, `${Object.keys(headers).length} headers`);
    // Chrome logs one "Failed to load resource: 404" line for the 404 page's own status; allow exactly that one.
    const own404 = pg === '/no-such-page' ? errs.filter(e => /status of 404/.test(e)).length : 0;
    check(v.length === 0 && errs.length === own404 && own404 <= 1, `no CSP violations or console errors ${pg}@${w}`, [...v, ...errs].join(' | '));
    if (pg === '/no-such-page') check(r.status() === 404 && (await p.textContent('h1')) === 'Page not found', `unknown address serves the 404 page ${w}`, 'status ' + r.status());
    if (pg === '/catalog.html') check(await p.locator('#catalog-results .product-card[data-id]').count() === 6, `catalog loads products from /api under CSP @${w}`);
    if (pg === '/') {
      check(await p.locator('.product-card').count() === 3 && await p.locator('.testimonial').count() === 2, `scripted sections render under CSP @${w}`);
      if (w === 375) { await p.click('.nav__toggle'); check(await p.getAttribute('.nav__toggle', 'aria-expanded') === 'true', 'menu opens under CSP'); }
      await p.fill('#newsletter-email', 'a@b.co'); await p.click('.newsletter__form .btn'); await p.waitForTimeout(150);
      check((await p.textContent('#newsletter-success')).startsWith('Thanks for subscribing'), `newsletter works under CSP @${w}`);
    }
    await p.close();
  }
  for (const f of ['/robots.txt', '/sitemap.xml', '/favicon.svg', '/og-image.png', '/apple-touch-icon.png']) { const r = await (await b.newPage()).goto(base + f); check(r.status() === 200, `${f} served`, r.headers()['content-type']); }
  const r = await (await b.newPage()).goto(base + '/.git/config'); check(r.status() === 404, '.git is not served');
  await b.close(); server.close(); console.log('FAILS:', fails); process.exit(fails ? 1 : 0);
}
