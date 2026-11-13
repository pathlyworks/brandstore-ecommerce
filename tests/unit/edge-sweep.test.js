/**
 * Task 6 edge-case sweep, pure parts: each `describe` is one row of the sweep table in task_6_handoff.md.
 * The browser parts of the same rows are in tests/dom/edge-sweep-ui.test.js and the end-to-end ones in
 * tests/e2e/specs/robustness.spec.js.
 */
import { describe, expect, it } from 'vitest';
import {
  fromTechsphere,
  TECHSPHERE_PAGE_SIZE,
  toAppProduct,
  toAppSpecs,
  toTechsphereRequest,
} from '../../src/api/techsphere.js';
import { checkoutItems, CHECKOUT_BLOCKED, EMPTY_CART, addToCart } from '../../src/state/cart.js';
import { resultsSummary } from '../../src/components/catalog-view.js';
import { ApiError, describeError } from '../../src/api/errors.js';
import { toAppError } from '../../src/api/techsphere.js';
import { checkoutErrorText } from '../../src/components/checkout.js';

const PLACEHOLDER = '/assets/product-placeholder.svg';
const base = {
  id: 'p-010',
  name: 'Pulse Phones 10',
  brand: 'Pulse',
  price: 15499,
  currency: 'EGP',
};

describe('edge 1: missing product image', () => {
  it('no images, an empty list, null or non-text entries give the placeholder (never a broken image)', () => {
    for (const images of [undefined, null, [], [null], [''], ['   '], [42], 'p.webp']) {
      const product = toAppProduct({ ...base, images });
      expect(product.image).toEqual({ url: PLACEHOLDER, alt: 'Pulse Phones 10' });
      expect(product.images).toEqual([{ url: PLACEHOLDER, alt: 'Pulse Phones 10' }]);
    }
  });

  it('absolute image URLs are used; paths to the API placeholder endpoint (/images/...) are not loaded', () => {
    const product = toAppProduct({
      ...base,
      images: ['/images/missing-9.webp', 'https://cdn.example/x.webp'],
    });
    expect(product.images).toEqual([{ url: 'https://cdn.example/x.webp', alt: 'Pulse Phones 10' }]);
    expect(toAppProduct({ ...base, images: ['/images/p-010.webp'] }).image.url).toBe(PLACEHOLDER);
  });

  it('a product without a name still has alt text', () => {
    expect(toAppProduct({ ...base, name: null }).image.alt).toBe('Unnamed product');
  });
});

describe('edge 2: null specification fields', () => {
  it('null, undefined and empty values are left out; labels are readable', () => {
    expect(
      toAppSpecs({
        warranty: '1 year',
        weight: null,
        colour: undefined,
        ram: '',
        battery_life: 12,
      }),
    ).toEqual([
      { label: 'Warranty', value: '1 year' },
      { label: 'Battery life', value: '12' },
    ]);
  });

  it('specs that are null, missing, an array or text give no rows (and never the word "null")', () => {
    for (const specs of [null, undefined, [], 'n/a', { a: null }]) {
      expect(toAppSpecs(specs)).toEqual([]);
      expect(JSON.stringify(toAppProduct({ ...base, specs }))).not.toContain('null"');
    }
  });

  it('a product with no brand gets a description without "by undefined"', () => {
    expect(toAppProduct({ ...base, brand: undefined }).description).toBe('Pulse Phones 10.');
  });
});

describe('edge 3: 429 rate limit', () => {
  it('a TechSphere 429 ({ error: "text" }) becomes RATE_LIMITED', () => {
    expect(toAppError(429, '/products', { error: 'Forced failure', status: 429 }).error.code).toBe(
      'RATE_LIMITED',
    );
  });

  it('the catalog message uses Retry-After when the API sends it, and "a moment" when it does not', () => {
    const withWait = describeError(new ApiError(429, 'RATE_LIMITED', 'slow down', [], 30));
    expect(withWait.title).toBe('Too many requests');
    expect(withWait.message).toContain('Wait 30 seconds');
    expect(withWait.action).toBe('retry');
    expect(describeError(new ApiError(429, 'RATE_LIMITED', 'slow down')).message).toContain(
      'Wait a moment',
    );
  });

  it('a 429 while placing an order keeps the cart and says when to try again', () => {
    expect(checkoutErrorText(new ApiError(429, 'RATE_LIMITED', 'x', [], 12))).toBe(
      'Your order was not placed. Too many requests. Wait 12 seconds, then try again. Your cart is unchanged.',
    );
  });
});

describe('edge 4: empty-cart checkout attempt', () => {
  it('an empty cart cannot start checkout and says why', () => {
    expect(checkoutItems(EMPTY_CART)).toEqual({
      ok: false,
      reason: 'empty',
      message: CHECKOUT_BLOCKED.empty,
    });
  });

  it('a cart with only out-of-stock lines cannot start checkout either', () => {
    const stale = {
      lines: [{ productId: 'p-004', name: 'X', unitPrice: 100, quantity: 1, stock: 0 }],
    };
    expect(checkoutItems(stale).reason).toBe('unavailable');
  });

  it('otherwise the order lists the in-stock lines as { productId, qty }', () => {
    let cart = addToCart(EMPTY_CART, { ...base, id: 'p-001', price: 100, stock: 25 }, 2);
    cart = { lines: [...cart.lines, { productId: 'p-004', unitPrice: 1, quantity: 1, stock: 0 }] };
    expect(checkoutItems(cart)).toEqual({ ok: true, items: [{ productId: 'p-001', qty: 2 }] });
  });
});

describe('edge 5: offset-versus-page pagination mismatch', () => {
  const page = (n, count, total) =>
    fromTechsphere(`/products?page=${n}`, {
      items: Array.from({ length: count }, (_, i) => ({ ...base, id: `p-${i}` })),
      page: n,
      total_pages: Math.ceil(total / TECHSPHERE_PAGE_SIZE),
      total,
    });

  it('products page by `page` (8 a page): a short last page still counts from the page size', () => {
    const last = page(3, 4, 20);
    expect(last.meta).toEqual({ page: 3, limit: 8, total: 20, totalPages: 3 });
    expect(resultsSummary(last.meta, 4)).toBe('Showing 17–20 of 20 products');
  });

  it('a page past the end comes back empty with the real total, so the catalog can go to the last page', () => {
    const past = page(9, 0, 24);
    expect(past.data).toEqual([]);
    expect(past.meta).toEqual({ page: 9, limit: 8, total: 24, totalPages: 3 });
  });

  it('orders page by `offset`: the app page becomes an offset and back', () => {
    expect(toTechsphereRequest('/account/orders?limit=5&page=2')).toBe(
      '/account/orders?limit=5&offset=5',
    );
    expect(toTechsphereRequest('/account/orders?limit=5&page=-3')).toBe(
      '/account/orders?limit=5&offset=0',
    );
    const body = (offset, count) => ({
      items: Array.from({ length: count }, (_, i) => ({ id: `o-${i}`, items: [], total: 1 })),
      offset,
      limit: 5,
      total: 9,
    });
    expect(fromTechsphere('/account/orders', body(5, 4)).meta).toEqual({
      page: 2,
      limit: 5,
      total: 9,
      totalPages: 2,
    });
    // An offset that is not a multiple of the limit (another client paging by 3) lands on the page that holds it.
    expect(fromTechsphere('/account/orders', body(3, 5)).meta.page).toBe(1);
  });

  it('a missing or broken page count from the API never gives 0 pages', () => {
    const odd = fromTechsphere('/products', {
      items: [],
      page: null,
      total_pages: null,
      total: 17,
    });
    expect(odd.meta).toEqual({ page: 1, limit: 8, total: 17, totalPages: 3 });
  });
});
