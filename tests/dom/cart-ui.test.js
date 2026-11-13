// @vitest-environment jsdom
/**
 * Integration: the real cart module (components/cart-view.js with the Axios product API, the
 * localStorage-backed stores, cart lines, totals and saved list) rendered into the real cart.html
 * markup. On load the cart re-checks each product with GET /products/{id}; Mock Service Worker
 * answers 200, 404, 401, 429 and 500. Assertions use what the shopper sees.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import * as storage from '../../src/utils/storage.js';
import { createProductApi } from '../../src/api/product-api.js';
import { toLine } from '../../src/state/cart.js';
import { createCartStore, createRecentStore, createSavedStore } from '../../src/state/stores.js';
import { mount } from '../../src/components/cart-view.js';
import { PRODUCTS } from '../../mock-server/data.mjs';
import { API, apiError, handlers, seen } from '../support/api-handlers.js';
import { loadPage } from '../support/page.js';
import { click, screen, valueOfTerm, within } from '../support/screen.js';

const server = setupServer(...handlers);
const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(async () => {
  seen.length = 0;
  window.localStorage.clear();
  window.sessionStorage.clear();
  await loadPage('cart.html');
});

/**
 * Store a cart as an earlier visit would have left it.
 * @param {[string, number, number?][]} lines [productId, quantity, stored unit price]
 */
function storeCart(lines) {
  const stored = lines.map(([id, quantity, price = byId[id].price]) =>
    toLine({ ...byId[id], price }, quantity),
  );
  window.localStorage.setItem(storage.KEYS.cart, JSON.stringify({ lines: stored }));
}

/** Mount the cart exactly as src/pages/cart.js does, with the test API address. */
function mountCart() {
  return mount(document.getElementById('main-content'), {
    api: createProductApi({ baseURL: API, dialect: 'brandstore' }),
    cart: createCartStore(storage),
    saved: createSavedStore(storage),
    recent: createRecentStore(storage),
  });
}

/** Make every GET /products/{id} answer with this response. */
const productAnswer = (respond) => server.use(http.get(`${API}/products/:id`, respond));

const summary = () => screen.getByRole('complementary', { name: 'Order summary' });
const lines = () => within(screen.getByRole('region', { name: 'Items in your cart' }));

describe('cart against the API (MSW)', () => {
  it('200: shows the stored lines, re-checks each price and announces a change', async () => {
    storeCart([
      ['headphones-pro', 1, 18999], // stored when it cost $189.99; the API now says $199.99
      ['ceramic-mug', 2],
    ]);
    await mountCart().ready;
    expect(seen.map((url) => new URL(url).pathname).sort()).toEqual([
      '/api/products/ceramic-mug',
      '/api/products/headphones-pro',
    ]);
    expect(screen.getByText('Wireless Headphones Pro is now $199.99 (was $189.99).')).toBeTruthy();
    expect(
      lines()
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual(['Wireless Headphones Pro', 'Stoneware Mug Set']);
    expect(valueOfTerm('Items', summary())).toBe('3');
    expect(valueOfTerm('Subtotal', summary())).toBe('$263.99');
    expect(valueOfTerm('Shipping', summary())).toBe('Free');
    expect(valueOfTerm('Total', summary())).toBe('$263.99');
  });

  it('200: removing a line updates the totals and the shipping rule', async () => {
    storeCart([
      ['headphones-pro', 1],
      ['ceramic-mug', 1],
    ]);
    await mountCart().ready;
    click(lines().getByRole('button', { name: 'Remove Wireless Headphones Pro from the cart' }));
    expect(valueOfTerm('Subtotal', summary())).toBe('$32.00');
    expect(valueOfTerm('Shipping', summary())).toBe('$7.99');
    expect(valueOfTerm('Total', summary())).toBe('$39.99');
    expect(within(summary()).getByText('Add $68.00 more for free shipping.')).toBeTruthy();
  });

  it('empty: an empty cart says so, offers the catalog and asks the API nothing', async () => {
    await mountCart().ready;
    expect(screen.getByText('Your cart is empty.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Browse products' }).getAttribute('href')).toBe(
      'catalog.html',
    );
    expect(lines().queryAllByRole('listitem')).toEqual([]);
    expect(screen.queryByRole('button', { name: 'Clear cart' })).toBe(null);
    expect(valueOfTerm('Total', summary())).toBe('$0.00');
    expect(seen).toEqual([]);
  });

  it('404: a product the store no longer sells stays visible but is not charged', async () => {
    storeCart([
      ['ceramic-mug', 1],
      ['headphones-pro', 1],
    ]);
    productAnswer(({ params }) =>
      params.id === 'headphones-pro' ? apiError(404) : HttpResponse.json({ data: byId[params.id] }),
    );
    await mountCart().ready;
    expect(
      lines().getByText('Out of stock: not included in the total. Save it for later or remove it.'),
    ).toBeTruthy();
    expect(valueOfTerm('Items', summary())).toBe('1');
    expect(valueOfTerm('Subtotal', summary())).toBe('$32.00');
  });

  for (const [status, options] of [
    [401, {}],
    [429, { retryAfter: 30 }],
    [500, {}],
  ]) {
    it(`${status}: keeps the stored cart and says the prices could not be checked`, async () => {
      storeCart([['ceramic-mug', 2, 3000]]); // stored price $30.00
      productAnswer(() => apiError(status, options));
      await mountCart().ready;
      expect(
        screen.getByText(
          'We could not check the latest prices and stock right now, so the cart shows the prices from when you added the items. Reload the page to try again.',
        ),
      ).toBeTruthy();
      expect(
        lines()
          .getAllByRole('link')
          .map((a) => a.textContent),
      ).toEqual(['Stoneware Mug Set']);
      expect(valueOfTerm('Subtotal', summary())).toBe('$60.00');
      expect(
        lines().getByRole('button', { name: 'Remove Stoneware Mug Set from the cart' }),
      ).toBeTruthy();
    });
  }
});
