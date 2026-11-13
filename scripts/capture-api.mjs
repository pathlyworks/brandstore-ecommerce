/**
 * Captures what the TechSphere API really returns, for the TypeScript domain types
 * (docs/migration/observed/, read by src/types/*.ts checks and docs/migration/MIGRATION_PLAN.md).
 *   node scripts/capture-api.mjs                     # starts the API kit's server.py (Python 3.9+)
 *   VITE_API_BASE=http://localhost:4010 node scripts/capture-api.mjs   # an API that is already running
 * Every response is saved with its status and content type: one file per call, plus index.json.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { startTechsphere } from '../tests/support/techsphere-server.mjs';

const OUT = 'docs/migration/observed';
const given = process.env.VITE_API_BASE;
const kit = given ? null : await startTechsphere();
const base = (given || kit.url).replace(/\/+$/, '');
mkdirSync(OUT, { recursive: true });
const index = [];

/** One call; saves { request, status, contentType, body }. */
async function call(name, method, path, { body, token, note = '' } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { _notJson: text.slice(0, 200) };
  }
  const record = {
    request: {
      method,
      path,
      ...(body
        ? {
            body:
              name.startsWith('login') || name.startsWith('register')
                ? { ...body, password: '***' }
                : body,
          }
        : {}),
    },
    status: res.status,
    contentType: res.headers.get('content-type'),
    retryAfter: res.headers.get('retry-after'),
    note,
    body: json,
  };
  writeFileSync(join(OUT, `${name}.json`), `${JSON.stringify(record, null, 2)}\n`);
  index.push({ name, method, path, status: res.status, note });
  return json;
}

if (kit) await kit.reset();
await call('categories', 'GET', '/categories');
await call('categories-ar', 'GET', '/categories?locale=ar');
for (const page of [1, 2, 3]) await call(`products-page-${page}`, 'GET', `/products?page=${page}`);
await call('products-page-9', 'GET', '/products?page=9', { note: 'past the end' });
await call('products-filtered', 'GET', '/products?category=audio&sort=price_desc&min_price=3000');
await call('products-search-ar', 'GET', '/products?search=orbit&locale=ar');
await call('products-bad-sort', 'GET', '/products?sort=name_asc', { note: '400' });
await call('products-bad-page', 'GET', '/products?page=abc', { note: '400' });
for (const id of ['p-001', 'p-005', 'p-007', 'p-010'])
  await call(`product-${id}`, 'GET', `/products/${id}`);
await call('product-missing', 'GET', '/products/p-999', { note: '404' });
await call('image-ok', 'GET', '/images/p-001.webp', { note: 'JSON, not image bytes' });
await call('image-missing', 'GET', '/images/missing-9.webp', { note: '404' });
await call('login-wrong', 'POST', '/auth/login', {
  body: { email: 'student@techsphere.test', password: 'wrong' },
});
const shopper = await call('login-shopper', 'POST', '/auth/login', {
  body: { email: 'student@techsphere.test', password: 'Passw0rd!' },
});
const admin = await call('login-admin', 'POST', '/auth/login', {
  body: { email: 'admin@techsphere.test', password: 'Admin123!' },
});
await call('register-ok', 'POST', '/auth/register', {
  body: { name: 'New Shopper', email: 'new.shopper@example.test', password: 'Passw0rd!' },
});
await call('register-taken', 'POST', '/auth/register', {
  body: { email: 'student@techsphere.test', password: 'Passw0rd!' },
});
await call('register-invalid', 'POST', '/auth/register', {
  body: { email: 'nope', password: 'short' },
});
const t = shopper.token;
await call('orders-no-token', 'GET', '/account/orders', { note: '401' });
await call('orders-page-1', 'GET', '/account/orders', { token: t });
await call('orders-offset-5', 'GET', '/account/orders?offset=5&limit=5', { token: t });
await call('order-cancel-ok', 'PATCH', '/account/orders/o-001/cancel', { token: t });
await call('order-cancel-shipped', 'PATCH', '/account/orders/o-002/cancel', {
  token: t,
  note: '409',
});
await call('order-cancel-missing', 'PATCH', '/account/orders/o-999/cancel', {
  token: t,
  note: '404',
});
await call('addresses', 'GET', '/account/addresses', { token: t });
await call('address-put-ok', 'PUT', '/account/addresses/a-1', {
  token: t,
  body: { city: 'Cairo', street: '90th Street, New Cairo' },
});
await call('address-put-no-city', 'PUT', '/account/addresses/a-1', {
  token: t,
  body: { street: 'x' },
  note: '400',
});
await call('address-delete', 'DELETE', '/account/addresses/a-2', {
  token: t,
  note: '204, no body',
});
await call('order-place-ok', 'POST', '/orders', {
  token: t,
  body: { items: [{ productId: 'p-001', qty: 1 }] },
});
await call('order-place-empty', 'POST', '/orders', { token: t, body: { items: [] }, note: '400' });
await call('admin-summary', 'GET', '/admin/summary', { token: admin.token });
await call('admin-summary-shopper', 'GET', '/admin/summary', { token: t, note: '403' });
if (kit) {
  await kit.control({ fail: { path: '/products', status: 429, times: 1 } });
  await call('products-429', 'GET', '/products', {
    note: 'forced with the kit /__control (grader mode)',
  });
  await kit.reset();
}
writeFileSync(
  join(OUT, 'index.json'),
  `${JSON.stringify({ capturedAt: new Date().toISOString(), api: given ? 'VITE_API_BASE' : 'api/techsphere/server.py (kit 1.1)', calls: index }, null, 2)}\n`,
);
console.log(index.map((c) => `${c.status} ${c.method} ${c.path}`).join('\n'));
kit?.stop();
