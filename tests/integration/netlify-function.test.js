// @vitest-environment node
/**
 * Integration: the Netlify function (netlify/functions/api.mjs) serves the same API on /api/* as
 * the local servers, so the deployed catalog works. Called directly with Fetch API Requests.
 */
import { describe, expect, it } from 'vitest';
import handler from '../../netlify/functions/api.mjs';

/** Call the function like Netlify would. */
const call = (path, init) =>
  handler(new Request(`https://brandstore.example${path}`, init), { ip: '203.0.113.9' });

describe('Netlify function /api/*', () => {
  it('lists products with the same filters and envelope', async () => {
    const response = await call('/api/products?category=electronics&sort=price_asc&limit=2');
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.map((p) => p.id)).toEqual(['usb-c-hub', 'bluetooth-speaker']);
    expect(body.meta.total).toBe(4);
  });
  it('returns 400 and 404 with the error envelope', async () => {
    expect((await call('/api/products?limit=500')).status).toBe(400);
    const missing = await call('/api/products/no-such-product');
    expect([missing.status, (await missing.json()).error.code]).toEqual([404, 'NOT_FOUND']);
  });
  it('accepts a JSON body (POST /auth/login)', async () => {
    const response = await call('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@brandstore.test', password: 'Passw0rd!' }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).data.tokenType).toBe('Bearer');
  });
});
