/** Unit tests for the request auditor used by the e2e run (tests/e2e/request-audit.mjs). */
import { describe, expect, it } from 'vitest';
import { auditRequest } from '../e2e/request-audit.mjs';

const get = (path, headers = {}) =>
  auditRequest({ method: 'GET', url: `http://site.test/api${path}`, headers });

describe('auditRequest', () => {
  it('accepts requests the client really sends', () => {
    expect(get('/products?category=electronics&limit=6&page=1&sort=price_asc')).toEqual([]);
    expect(
      get('/products?minRating=4.5&minPrice=3000&maxPrice=8000&q=lamp&brand=Hearth&limit=6&page=1'),
    ).toEqual([]);
    expect(
      get('/products/smartwatch', { 'x-client-id': 'web-abc123', accept: 'application/json' }),
    ).toEqual([]);
  });
  it('reports undeclared parameters, bad values, undeclared headers, methods and paths', () => {
    expect(get('/products?colour=red')[0]).toContain('"colour" is not in the spec');
    expect(get('/products?limit=500')[0]).toContain('limit=500 does not fit');
    expect(get('/products/BAD%20ID')[0]).toContain('does not fit the schema');
    expect(get('/products', { 'x-debug': '1' })[0]).toContain('header x-debug is not in the spec');
    expect(
      auditRequest({ method: 'DELETE', url: 'http://site.test/api/products/a', headers: {} })[0],
    ).toContain('method not documented');
    expect(get('/cart')[0]).toContain('no such path');
  });
});
