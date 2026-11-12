/**
 * Guards the module plan before any feature code exists: every module in docs/ARCHITECTURE.md
 * exists and exports its planned functions, and api/endpoints.js matches api/openapi.json.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENDPOINTS } from '../../src/api/endpoints.js';

const spec = JSON.parse(readFileSync(new URL('../../api/openapi.json', import.meta.url), 'utf8'));

const PLAN = {
  'api/http.js': ['createHttpClient'],
  'api/products.js': ['listProducts', 'getProduct'],
  'api/auth.js': ['login', 'register'],
  'api/account.js': [
    'listOrders',
    'cancelOrder',
    'listAddresses',
    'updateAddress',
    'deleteAddress',
  ],
  'api/errors.js': ['ApiError'],
  'state/store.js': ['createStore'],
  'state/cart.js': [
    'addToCart',
    'updateQuantity',
    'removeFromCart',
    'clearCart',
    'cartReducer',
    'cartSummary',
  ],
  'state/saved.js': ['saveItem', 'moveToCart', 'moveToSaved', 'removeSaved'],
  'state/stores.js': [
    'createCartStore',
    'createSavedStore',
    'createRecentStore',
    'createSessionStore',
    'createFlagsStore',
  ],
  'state/catalog.js': ['createCatalogState'],
  'utils/cart-math.js': ['lineTotal', 'subtotal', 'shippingFor', 'totals', 'clampQuantity'],
  'utils/query-string.js': ['buildQuery', 'parseCatalogQuery'],
  'utils/money.js': ['toCents', 'formatMoney'],
  'utils/storage.js': ['readJson', 'writeJson', 'remove'],
  'utils/validate.js': ['validateLogin', 'validateRegister', 'validateAddress'],
  'utils/jwt.js': ['decodeJwtPayload', 'expiryOf'],
  'utils/dates.js': ['parseOrderDate', 'formatOrderDate'],
  'state/session.js': ['isActive', 'rehydrateSession', 'withFlags', 'rehydrateFlags'],
  'utils/dom.js': ['el'],
};

describe('module map', () => {
  for (const [file, names] of Object.entries(PLAN)) {
    it(`src/${file} exports ${names.join(', ')}`, async () => {
      const mod = await import(`../../src/${file}`);
      for (const name of names) expect(typeof mod[name]).toBe('function');
    });
  }

  it('no planned stub is left: every module in src/ is implemented', () => {
    const walk = (dir) =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? e.name === 'vendor'
            ? []
            : walk(join(dir, e.name))
          : [join(dir, e.name)],
      );
    const stubs = walk(fileURLToPath(new URL('../../src', import.meta.url)))
      .filter((f) => f.endsWith('.js'))
      .filter((f) => /notImplemented|planned but not implemented/.test(readFileSync(f, 'utf8')));
    expect(stubs).toEqual([]);
  });
});

describe('api/endpoints.js matches the OpenAPI paths', () => {
  const toTemplate = (path) => path.replace(/\/x-id(?=\/|$)/, '/{id}');
  const built = [
    ENDPOINTS.products,
    ENDPOINTS.product('x-id'),
    ENDPOINTS.login,
    ENDPOINTS.register,
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
