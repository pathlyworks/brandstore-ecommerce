/**
 * GitHub Pages has no rewrites: a deep link such as /products/p-001 is answered by 404.html with HTTP status
 * 404, even though the app then renders the page. Search engines and Lighthouse treat that as a missing page
 * (found by the scheduled Lighthouse run, Task 7). This script writes a copy of the app shell at every
 * public route (`products.html`, `products/p-001.html`...), so Pages answers them with 200:
 *
 *   node web/scripts/pages-routes.mjs web/dist
 *
 * Product pages come from the API kit's catalog (api/techsphere/fixtures/products.json). Signed-in routes
 * (/account, /checkout, /admin) keep the 404.html fallback: they are never indexed and redirect to sign-in.
 */
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(process.argv[2] ?? join(here, '../dist'));
const catalog = JSON.parse(
  readFileSync(join(here, '../../api/techsphere/fixtures/products.json'), 'utf8'),
);
const products = Array.isArray(catalog) ? catalog : (catalog.items ?? catalog.products ?? []);

const routes = [
  'products',
  'cart',
  'login',
  'register',
  'compare',
  ...products.map((p) => `products/${p.id}`),
];

const shell = join(dist, 'index.html');
for (const route of routes) {
  // /cart is served from cart.html (Pages maps extensionless paths to .html), with no redirect to /cart/.
  const target = join(dist, `${route}.html`);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(shell, target);
}
copyFileSync(shell, join(dist, '404.html'));
console.log(`pages-routes: app shell written at ${routes.length} routes (+ 404.html) in ${dist}`);
