// @vitest-environment node
/** Integration: the Axios product module against the real mock server. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { start } from '../../mock-server/server.mjs';
import { createProductApi, fetchProduct } from '../../src/api/product-api.js';

let server;
let api;

beforeAll(async () => {
  server = await start({ port: 0, rateLimitMax: 10000 });
  api = createProductApi({ baseURL: server.url });
});
afterAll(() => server.close());

describe('GET /products/{id} through Axios', () => {
  it('returns the product with a gallery and a specs table', async () => {
    const product = await fetchProduct(api, 'headphones-pro');
    expect([product.name, product.price, product.images.length]).toEqual([
      'Wireless Headphones Pro',
      19999,
      3,
    ]);
    expect(product.specs.some((s) => s.label === 'Battery life')).toBe(true);
  });
  it('reports a missing product as ApiError 404', async () => {
    let caught;
    await fetchProduct(api, 'no-such-product').catch((e) => {
      caught = e;
    });
    expect([caught.name, caught.status, caught.code]).toEqual(['ApiError', 404, 'NOT_FOUND']);
  });
  it('reports a server error as ApiError 500', async () => {
    let caught;
    await fetchProduct(api, 'smartwatch', { headers: { 'X-Mock-Status': '500' } }).catch((e) => {
      caught = e;
    });
    expect(caught.status).toBe(500);
  });
});
