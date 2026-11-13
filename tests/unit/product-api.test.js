/** Unit tests for the Axios module: the request interceptor and the error conversion. */
import { describe, expect, it } from 'vitest';
import { createProductApi, fetchProduct } from '../../src/api/product-api.js';

/** An Axios adapter that records the request and answers with the given status and body. */
function fakeAdapter(status, data, headers = {}) {
  const seen = [];
  const adapter = async (config) => {
    seen.push(config);
    const response = { data, status, statusText: '', headers, config, request: {} };
    if (status >= 400) {
      const error = new Error(`Request failed with status code ${status}`);
      error.response = response;
      error.config = config;
      throw error;
    }
    return response;
  };
  return { seen, adapter };
}

describe('product-api (Axios)', () => {
  it('the request interceptor adds Accept and X-Client-Id and the base URL', async () => {
    const { seen, adapter } = fakeAdapter(200, { data: { id: 'smartwatch' } });
    const api = createProductApi({ baseURL: '/api', adapter, dialect: 'brandstore' }); // our mock
    expect((await fetchProduct(api, 'smartwatch')).id).toBe('smartwatch');
    expect(seen[0].url).toBe('/products/smartwatch');
    expect(seen[0].baseURL).toBe('/api');
    expect(seen[0].headers.get('Accept')).toBe('application/json');
    expect(String(seen[0].headers.get('X-Client-Id')).startsWith('web-')).toBe(true);
  });
  it('turns an error response into the same ApiError the fetch modules use', async () => {
    const body = { error: { code: 'RATE_LIMITED', message: 'Slow down' } };
    const { adapter } = fakeAdapter(429, body, { 'retry-after': '5' });
    let caught;
    await fetchProduct(createProductApi({ adapter }), 'x').catch((e) => {
      caught = e;
    });
    expect([caught.name, caught.status, caught.code, caught.retryAfter]).toEqual([
      'ApiError',
      429,
      'RATE_LIMITED',
      5,
    ]);
  });
});
