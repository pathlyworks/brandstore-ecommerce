/**
 * Exercises every endpoint of the BrandStore API, records what actually comes back, and checks
 * it against api/openapi.json.
 *
 *   npm run contract                       # starts its own mock server on a free port
 *   API_URL=http://127.0.0.1:4010 npm run contract   # or test a server that is already running
 *   SPEC=path/to/openapi.json npm run contract        # or check against another spec file
 *
 * Writes:
 *   docs/api/observed.json                   every request, status, error code, headers and JSON shape
 *   docs/api/ENDPOINTS.md                    the endpoint table (spec vs observed) and the request log
 *   docs/api/brandstore.postman_collection.json  the same requests for Postman / Insomnia
 * Exit code 1 if any status differs from the expectation, a body breaks its schema, or a status
 * code is documented but never observed (or observed but not documented).
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { start } from '../mock-server/server.mjs';
import { validate, shapeOf } from './lib/schema.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
// SPEC lets you point the same checks at the official specification once it is available.
const specPath = process.env.SPEC || `${root}api/openapi.json`;
const spec = JSON.parse(await readFile(specPath, 'utf8'));
const RATE_LIMIT = 60; // must match the server under test (mock default)

const own = process.env.API_URL ? null : await start({ port: 0, rateLimitMax: RATE_LIMIT });
const base = process.env.API_URL || own.url;
const vars = { token: '' };

const login = { email: 'demo@brandstore.test', password: 'Passw0rd!' };
const newAddress = {
  label: 'Office',
  fullName: 'Demo Shopper',
  line1: '5 Tahrir Square',
  city: 'Cairo',
  postalCode: '11511',
  country: 'EG',
};

/**
 * [operationId, method, path template, url, expected status, options]
 * options: { auth: true | 'bad', body, raw, note, save }
 */
const cases = [
  ['listProducts', 'GET', '/products', '/products', 200, { note: 'defaults: page 1, limit 12' }],
  [
    'listProducts',
    'GET',
    '/products',
    '/products?category=electronics&sort=price_asc&page=1&limit=2',
    200,
    { note: 'filter + sort + page size' },
  ],
  [
    'listProducts',
    'GET',
    '/products',
    '/products?q=wool&minPrice=1000&maxPrice=5000&inStock=true',
    200,
    { note: 'search + price range + stock' },
  ],
  [
    'listProducts',
    'GET',
    '/products',
    '/products?page=99&limit=12',
    200,
    { note: 'page past the end: empty data, not 404' },
  ],
  ['listProducts', 'GET', '/products', '/products?limit=500', 400, { note: 'limit above 50' }],
  [
    'listProducts',
    'GET',
    '/products',
    '/products?minPrice=9000&maxPrice=1000',
    400,
    { note: 'minPrice > maxPrice' },
  ],
  [
    'listProducts',
    'GET',
    '/products',
    '/products?category=toys&sort=cheapest',
    400,
    { note: 'unknown category and sort (two details)' },
  ],
  [
    'listProducts',
    'GET',
    '/products',
    '/products?brand=Northline&minRating=4.4&sort=price_desc',
    200,
    {
      note: 'brand + minimum rating + sort (Task 2)',
      expectIds: ['leather-backpack', 'merino-tee'],
    },
  ],
  [
    'listProducts',
    'GET',
    '/products',
    '/products?category=electronics&sort=price_asc&page=2&limit=2',
    200,
    { note: 'page 2 of a filtered, sorted list', expectIds: ['smartwatch', 'headphones-pro'] },
  ],
  [
    'listProducts',
    'GET',
    '/products',
    '/products?brand=Acme&minRating=6',
    400,
    { note: 'unknown brand, rating above 5' },
  ],
  [
    'listProducts',
    'GET',
    '/products',
    '/products',
    500,
    { mockStatus: '500', note: 'X-Mock-Status: 500 (mock-only hook)' },
  ],
  ['getProduct', 'GET', '/products/{id}', '/products/headphones-pro', 200, {}],
  [
    'getProduct',
    'GET',
    '/products/{id}',
    '/products/headphones-pro',
    500,
    { mockStatus: '500', note: 'X-Mock-Status: 500 (mock-only hook)' },
  ],
  ['getProduct', 'GET', '/products/{id}', '/products/does-not-exist', 404, {}],
  [
    'getProduct',
    'GET',
    '/products/{id}',
    '/products/BAD%20ID',
    400,
    { note: 'id breaks the pattern' },
  ],
  [
    'login',
    'POST',
    '/auth/login',
    '/auth/login',
    400,
    { body: {}, note: 'missing email and password' },
  ],
  [
    'login',
    'POST',
    '/auth/login',
    '/auth/login',
    400,
    { raw: '{not json', note: 'malformed JSON' },
  ],
  [
    'login',
    'POST',
    '/auth/login',
    '/auth/login',
    401,
    { body: { ...login, password: 'wrong' }, note: 'wrong password' },
  ],
  ['login', 'POST', '/auth/login', '/auth/login', 200, { body: login, save: true }],
  [
    'register',
    'POST',
    '/auth/register',
    '/auth/register',
    400,
    { body: { email: 'bad', password: 'short' }, note: 'invalid email and short password' },
  ],
  [
    'register',
    'POST',
    '/auth/register',
    '/auth/register',
    400,
    { body: { ...login, name: 'Demo' }, note: 'email already registered (EMAIL_TAKEN)' },
  ],
  [
    'register',
    'POST',
    '/auth/register',
    '/auth/register',
    201,
    { body: { name: 'New Shopper', email: 'new@brandstore.test', password: 'NewPassw0rd' } },
  ],
  [
    'listOrders',
    'GET',
    '/account/orders',
    '/account/orders',
    401,
    { note: 'no Authorization header' },
  ],
  [
    'listOrders',
    'GET',
    '/account/orders',
    '/account/orders',
    401,
    { auth: 'bad', note: 'unknown token' },
  ],
  ['listOrders', 'GET', '/account/orders', '/account/orders', 200, { auth: true }],
  [
    'listOrders',
    'GET',
    '/account/orders',
    '/account/orders?status=processing&limit=5',
    200,
    { auth: true },
  ],
  ['listOrders', 'GET', '/account/orders', '/account/orders?status=lost', 400, { auth: true }],
  ['cancelOrder', 'PATCH', '/account/orders/{id}/cancel', '/account/orders/o-1003/cancel', 401, {}],
  [
    'cancelOrder',
    'PATCH',
    '/account/orders/{id}/cancel',
    '/account/orders/o-1003/cancel',
    400,
    { auth: true, body: { reason: 'x'.repeat(201) }, note: 'reason too long' },
  ],
  [
    'cancelOrder',
    'PATCH',
    '/account/orders/{id}/cancel',
    '/account/orders/o-1003/cancel',
    200,
    { auth: true, body: { reason: 'Ordered by mistake' } },
  ],
  [
    'cancelOrder',
    'PATCH',
    '/account/orders/{id}/cancel',
    '/account/orders/o-1003/cancel',
    400,
    { auth: true, note: 'already cancelled' },
  ],
  [
    'cancelOrder',
    'PATCH',
    '/account/orders/{id}/cancel',
    '/account/orders/o-1001/cancel',
    400,
    { auth: true, note: 'delivered order' },
  ],
  [
    'cancelOrder',
    'PATCH',
    '/account/orders/{id}/cancel',
    '/account/orders/o-9999/cancel',
    404,
    { auth: true },
  ],
  ['listAddresses', 'GET', '/account/addresses', '/account/addresses', 401, {}],
  ['listAddresses', 'GET', '/account/addresses', '/account/addresses', 200, { auth: true }],
  [
    'putAddress',
    'PUT',
    '/account/addresses/{id}',
    '/account/addresses/office',
    401,
    { body: newAddress },
  ],
  [
    'putAddress',
    'PUT',
    '/account/addresses/{id}',
    '/account/addresses/office',
    201,
    { auth: true, body: newAddress, note: 'new id: created' },
  ],
  [
    'putAddress',
    'PUT',
    '/account/addresses/{id}',
    '/account/addresses/office',
    200,
    { auth: true, body: { ...newAddress, line2: 'Floor 3' }, note: 'same id again: replaced' },
  ],
  [
    'putAddress',
    'PUT',
    '/account/addresses/{id}',
    '/account/addresses/office',
    400,
    { auth: true, body: { ...newAddress, country: 'Egypt', postalCode: '' } },
  ],
  ['deleteAddress', 'DELETE', '/account/addresses/{id}', '/account/addresses/office', 401, {}],
  [
    'deleteAddress',
    'DELETE',
    '/account/addresses/{id}',
    '/account/addresses/office',
    200,
    { auth: true },
  ],
  [
    'deleteAddress',
    'DELETE',
    '/account/addresses/{id}',
    '/account/addresses/office',
    404,
    { auth: true, note: 'already deleted' },
  ],
  [null, 'GET', '(unknown route)', '/nothing-here', 404, { note: 'not an operation' }],
  [null, 'DELETE', '/products', '/products', 405, { note: 'wrong method; Allow header lists GET' }],
];

const log = [];

async function call(c, clientId = 'contract-run') {
  const [operationId, method, template, path, expected, o] = c;
  const headers = { 'X-Client-Id': clientId };
  if (o.auth === true) headers.Authorization = `Bearer ${vars.token}`;
  if (o.auth === 'bad') headers.Authorization = 'Bearer not-a-real-token';
  if (o.mockStatus) headers['X-Mock-Status'] = o.mockStatus;
  let body;
  if (o.raw !== undefined) body = o.raw;
  else if (o.body !== undefined) body = JSON.stringify(o.body);
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + path, { method, headers, body });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (o.save && res.ok) vars.token = json.data.token;
  const pick = [
    'content-type',
    'retry-after',
    'www-authenticate',
    'location',
    'allow',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
  ];
  return {
    operationId,
    method,
    template,
    path,
    note: o.note || '',
    expected,
    status: res.status,
    errorCode: json?.error?.code ?? null,
    headers: Object.fromEntries(
      pick.filter((h) => res.headers.has(h)).map((h) => [h, res.headers.get(h)]),
    ),
    shape: shapeOf(json),
    body: json,
    request: { headers, body: o.raw ?? o.body },
    expectIds: o.expectIds,
  };
}

await fetch(`${base}/__reset`, { method: 'POST' });
for (const c of cases) log.push(await call(c));

// 429 on every operation: send RATE_LIMIT + 1 requests from a fresh client id.
for (const op of [...new Set(cases.filter((c) => c[0]).map((c) => c[0]))]) {
  const c = cases.find((x) => x[0] === op && x[4] < 300) || cases.find((x) => x[0] === op);
  const clientId = `burst-${op}`;
  for (let i = 0; i < RATE_LIMIT; i += 1) await call(c, clientId);
  const r = await call(c, clientId);
  log.push({ ...r, expected: 429, note: `request ${RATE_LIMIT + 1} within 60 s from one client` });
}
// Login lockout: 5 failures for one email, then a 6th attempt.
const lock = [
  'login',
  'POST',
  '/auth/login',
  '/auth/login',
  401,
  { body: { email: 'lockout@brandstore.test', password: 'nope' } },
];
for (let i = 0; i < 5; i += 1) await call(lock, 'lockout');
log.push({
  ...(await call(lock, 'lockout')),
  expected: 429,
  note: '6th failed login for one email within 60 s',
});

own?.close();

// ---- check against the spec ------------------------------------------------------------
const problems = [];
const ops = [];
for (const [template, item] of Object.entries(spec.paths)) {
  for (const [method, op] of Object.entries(item)) {
    const seen = log.filter((r) => r.operationId === op.operationId);
    const documented = Object.keys(op.responses).map(Number).sort();
    const observed = [...new Set(seen.map((r) => r.status))].sort();
    for (const s of documented)
      if (!observed.includes(s))
        problems.push(`${op.operationId}: ${s} documented but never observed`);
    for (const s of observed)
      if (!documented.includes(s))
        problems.push(`${op.operationId}: ${s} observed but not documented`);
    for (const r of seen) {
      const response = op.responses[r.status];
      if (!response) continue;
      const resolved = response.$ref
        ? spec.components.responses[response.$ref.split('/').pop()]
        : response;
      const schema = resolved.content['application/json'].schema;
      for (const p of validate(spec, schema, r.body))
        problems.push(`${op.operationId} ${r.status} (${r.path}): ${p}`);
      for (const h of Object.keys(resolved.headers || {}))
        if (!r.headers[h.toLowerCase()])
          problems.push(`${op.operationId} ${r.status}: header ${h} missing`);
    }
    ops.push({ method: method.toUpperCase(), template, op, documented, observed, seen });
  }
}
for (const r of log)
  if (r.status !== r.expected)
    problems.push(`${r.method} ${r.path}: expected ${r.expected}, got ${r.status}`);
// Results must match the fixtures (mock-server/data.mjs) where a case names the expected ids.
for (const r of log) {
  if (!r.expectIds) continue;
  const got = (r.body?.data || []).map((p) => p.id);
  if (JSON.stringify(got) !== JSON.stringify(r.expectIds))
    problems.push(`${r.path}: expected ids ${r.expectIds.join(',')}, got ${got.join(',')}`);
}

// ---- write the evidence ------------------------------------------------------------------
await mkdir(`${root}docs/api`, { recursive: true });
const stamp = new Date().toISOString();
await writeFile(
  `${root}docs/api/observed.json`,
  `${JSON.stringify({ generatedAt: stamp, baseUrl: process.env.API_URL ? base : 'mock-server (random local port)', rateLimit: RATE_LIMIT, requests: log.map(({ body: _b, ...r }) => r) }, null, 2)}\n`,
);

const fmtShape = (s) => JSON.stringify(s).replace(/"/g, '').replace(/,/g, ', ').replace(/:/g, ': ');
const successShape = (o) => {
  const ok = o.seen.find((r) => r.status < 300);
  if (!ok) return '';
  const s = structuredClone(ok.shape);
  if (Array.isArray(s.data) && s.data[0]) s.data = [Object.keys(s.data[0]).join(',')];
  else if (s.data && typeof s.data === 'object') s.data = Object.keys(s.data).join(',');
  return fmtShape(s);
};
const md = [];
md.push('# BrandStore API: endpoint table', '');
md.push(
  `Generated by \`npm run contract\` on ${stamp} against ${process.env.API_URL ? base : 'the local mock server'}. Do not edit by hand.`,
  '',
);
md.push(`Result: ${log.length} requests, ${problems.length} problems.`, '');
md.push(
  '| Method | Path | Auth | Summary | Status codes in spec | Status codes observed | Error codes observed | Success JSON (top level; data fields) |',
);
md.push('| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |');
for (const o of ops) {
  const codes = [...new Set(o.seen.map((r) => r.errorCode).filter(Boolean))].join(', ');
  md.push(
    `| ${o.method} | \`${o.template}\` | ${o.op.security ? 'Bearer' : 'none'} | ${o.op.summary} | ${o.documented.join(', ')} | ${o.observed.join(', ')} | ${codes} | ${successShape(o)} |`,
  );
}
md.push(
  '',
  'Outside the operations: an unknown path returns 404 NOT_FOUND; a known path with the wrong method returns 405 METHOD_NOT_ALLOWED with an Allow header; OPTIONS returns 204 (CORS preflight).',
  '',
);
md.push(
  '## Error body (all 4xx)',
  '',
  '```json',
  '{ "error": { "code": "VALIDATION_ERROR", "message": "One or more fields are invalid.", "details": [{ "field": "limit", "message": "must be an integer from 1 to 50" }] } }',
  '```',
  '',
);
md.push(
  '## Request log',
  '',
  '| # | Request | Expected | Observed | error.code | Notable headers | Note |',
  '| ---: | :--- | :--- | :--- | :--- | :--- | :--- |',
);
log.forEach((r, i) => {
  const h = ['retry-after', 'www-authenticate', 'location', 'allow']
    .filter((k) => r.headers[k])
    .map((k) => `${k}: ${r.headers[k]}`)
    .join('; ');
  md.push(
    `| ${i + 1} | ${r.method} \`${r.path.length > 70 ? `${r.path.slice(0, 67)}...` : r.path}\` | ${r.expected} | ${r.status}${r.status === r.expected ? '' : ' MISMATCH'} | ${r.errorCode ?? ''} | ${h} | ${r.note} |`,
  );
});
md.push(
  '',
  '## Problems',
  '',
  problems.length
    ? problems.map((p) => `- ${p}`).join('\n')
    : 'None: every documented status code was observed, every observed code is documented, and every body matches its schema.',
  '',
);
await writeFile(`${root}docs/api/ENDPOINTS.md`, md.join('\n'));

// Postman collection (v2.1): the main requests, with status assertions. Import, set baseUrl, run.
const postman = {
  info: {
    name: 'BrandStore API (contract run)',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    description:
      'Generated by scripts/contract.mjs. Start the mock with `npm run mock`, then Run collection. The login request stores {{token}}.',
  },
  variable: [
    { key: 'baseUrl', value: 'http://127.0.0.1:4010' },
    { key: 'token', value: '' },
  ],
  item: cases.map(([operationId, method, , path, expected, o], i) => {
    const header = [{ key: 'X-Client-Id', value: 'postman' }];
    if (o.auth === true) header.push({ key: 'Authorization', value: 'Bearer {{token}}' });
    if (o.auth === 'bad') header.push({ key: 'Authorization', value: 'Bearer not-a-real-token' });
    const raw = o.raw ?? (o.body !== undefined ? JSON.stringify(o.body, null, 2) : undefined);
    if (raw !== undefined) header.push({ key: 'Content-Type', value: 'application/json' });
    const exec = [
      `pm.test('status is ${expected}', () => pm.response.to.have.status(${expected}));`,
    ];
    if (o.save) exec.push("pm.collectionVariables.set('token', pm.response.json().data.token);");
    return {
      name: `${String(i + 1).padStart(2, '0')} ${method} ${path} -> ${expected}${o.note ? ` (${o.note})` : ''}`,
      event: [{ listen: 'test', script: { type: 'text/javascript', exec } }],
      request: {
        method,
        header,
        url: `{{baseUrl}}${path}`,
        ...(raw !== undefined ? { body: { mode: 'raw', raw } } : {}),
        description: operationId || '',
      },
    };
  }),
};
await writeFile(
  `${root}docs/api/brandstore.postman_collection.json`,
  `${JSON.stringify(postman, null, 2)}\n`,
);

console.log(`${log.length} requests, ${ops.length} operations, ${problems.length} problems`);
for (const p of problems) console.log(`  - ${p}`);
process.exit(problems.length ? 1 : 0);
