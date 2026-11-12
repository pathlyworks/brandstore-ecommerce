/**
 * Guards the module plan before any feature code exists: every module in docs/ARCHITECTURE.md
 * exists and exports its planned functions, and api/endpoints.js matches api/openapi.json.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ENDPOINTS } from '../../src/api/endpoints.js';

const spec = JSON.parse(readFileSync(new URL('../../api/openapi.json', import.meta.url), 'utf8'));

const PLAN = {
  'api/http.js': ['createHttpClient'],
  'api/products.js': ['listProducts', 'getProduct'],
  'api/auth.js': ['login'],
  'api/orders.js': ['listOrders', 'cancelOrder'],
  'api/addresses.js': ['listAddresses', 'saveAddress', 'deleteAddress'],
  'api/errors.js': ['ApiError'],
  'state/store.js': ['createStore'],
  'state/cart.js': ['createCart'],
  'state/saved.js': ['createSaved'],
  'state/session.js': ['createSession'],
  'state/catalog.js': ['createCatalogState'],
  'utils/cart-math.js': ['lineTotal', 'subtotal', 'shippingFor', 'totals', 'clampQuantity'],
  'utils/query-string.js': ['buildQuery', 'parseCatalogQuery'],
  'utils/money.js': ['toCents', 'formatMoney'],
  'utils/storage.js': ['readJson', 'writeJson', 'remove'],
  'utils/validate.js': ['validateLogin', 'validateAddress'],
  'utils/dom.js': ['el'],
};

describe('module map', () => {
  for (const [file, names] of Object.entries(PLAN)) {
    it(`src/${file} exports ${names.join(', ')}`, async () => {
      const mod = await import(`../../src/${file}`);
      for (const name of names) expect(typeof mod[name]).toBe('function');
    });
  }

  it('planned functions fail loudly until implemented', async () => {
    const { subtotal } = await import('../../src/utils/cart-math.js');
    expect(() => subtotal([])).toThrow(/not implemented/);
  });
});

describe('api/endpoints.js matches the OpenAPI paths', () => {
  const toTemplate = (path) => path.replace(/\/x-id(?=\/|$)/, '/{id}');
  const built = [
    ENDPOINTS.products,
    ENDPOINTS.product('x-id'),
    ENDPOINTS.login,
    ENDPOINTS.orders,
    ENDPOINTS.cancelOrder('x-id'),
    ENDPOINTS.addresses,
    ENDPOINTS.address('x-id'),
  ].map(toTemplate);

  it('every client path is in the spec', () => {
    for (const path of built) expect(Object.keys(spec.paths)).toContain(path);
  });

  it('every spec path has a client path', () => {
    for (const path of Object.keys(spec.paths)) expect(built).toContain(path);
  });

  it('path ids are URL-encoded', () => {
    expect(ENDPOINTS.product('a/b')).toBe('/products/a%2Fb');
  });
});
