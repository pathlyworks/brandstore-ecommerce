// @vitest-environment node
/**
 * Integration: the real api/ modules against the real mock server (no stubs in between).
 * Every case in tests/fixtures/catalog-cases.json must return exactly the expected ids, total and
 * pages, and each error status must reach the caller as an ApiError with the right status.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { start } from '../../mock-server/server.mjs';
import { createHttpClient } from '../../src/api/http.js';
import { getProduct, listAllProducts, listProducts } from '../../src/api/products.js';
import { CATALOG_DEFAULTS } from '../../src/utils/query-string.js';

const fixtures = JSON.parse(
  readFileSync(new URL('../fixtures/catalog-cases.json', import.meta.url), 'utf8'),
);
let server;
let http;

beforeAll(async () => {
  server = await start({ port: 0, rateLimitMax: 10000 });
  http = createHttpClient({ baseUrl: server.url });
});
afterAll(() => server.close());

/** Await a rejection and return the error. */
async function failure(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the request to fail');
}

describe('GET /products matches the fixtures', () => {
  for (const c of fixtures.cases) {
    it(c.name, async () => {
      const body = await listProducts(http, { ...CATALOG_DEFAULTS, ...c.query });
      expect(body.data.map((p) => p.id)).toEqual(c.expect.ids);
      expect([body.meta.total, body.meta.totalPages]).toEqual([
        c.expect.total,
        c.expect.totalPages,
      ]);
    });
  }
  it('listAllProducts collects every page (used for facet counts)', async () => {
    const all = await listAllProducts(http, { q: '' });
    expect(all.length).toBe(fixtures.cases[0].expect.total);
  });
});

describe('errors reach the caller with their status', () => {
  for (const status of [400, 404, 429, 500]) {
    it(`X-Mock-Status ${status}`, async () => {
      const error = await failure(
        listProducts(http, CATALOG_DEFAULTS, { headers: { 'X-Mock-Status': String(status) } }),
      );
      expect([error.name, error.status]).toEqual(['ApiError', status]);
    });
  }
  it('unknown product is a 404', async () => {
    expect((await failure(getProduct(http, 'no-such-product'))).status).toBe(404);
  });
  it('an aborted request rejects with AbortError', async () => {
    const controller = new AbortController();
    const pending = listProducts(http, CATALOG_DEFAULTS, {
      signal: controller.signal,
      headers: { 'X-Mock-Delay': '500' },
    });
    controller.abort();
    expect((await failure(pending)).name).toBe('AbortError');
  });
});
