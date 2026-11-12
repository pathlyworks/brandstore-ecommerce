/**
 * Unit tests for the cart: pure functions (never mutate their input), totals against the
 * fixture reference calculations, the shipping rule, quantity limits and out-of-stock refusal.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PRODUCTS } from '../../mock-server/data.mjs';
import { clampQuantity, shippingFor, totals } from '../../src/utils/cart-math.js';
import {
  addToCart,
  availableLines,
  canAdd,
  clearCart,
  EMPTY_CART,
  priceChanges,
  rehydrate,
  removeFromCart,
  syncWithCatalog,
  updateQuantity,
} from '../../src/state/cart.js';

const fixtures = JSON.parse(
  readFileSync(new URL('../fixtures/cart-cases.json', import.meta.url), 'utf8'),
);
const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

/** Deep-freeze so any mutation inside a pure function throws (ES modules are strict). */
function freeze(value) {
  Object.values(value).forEach((v) => v && typeof v === 'object' && freeze(v));
  return Object.freeze(value);
}

describe('cart totals match the fixture reference calculations', () => {
  for (const c of fixtures.cases) {
    it(c.name, () => {
      const cart = c.lines.reduce(
        (acc, { productId, quantity }) => addToCart(acc, byId[productId], quantity),
        EMPTY_CART,
      );
      const t = totals(cart.lines);
      expect(t.itemCount).toBe(c.expected.itemCount);
      for (const key of ['subtotal', 'shipping', 'total']) {
        const diff = Math.abs(t[key] / 100 - c.expected[key]);
        expect(diff <= fixtures.tolerance).toBe(true);
      }
    });
  }
});

describe('shipping rule and quantity limits', () => {
  it('charges $7.99 below $100.00, nothing from $100.00, nothing for an empty cart', () => {
    expect([shippingFor(0), shippingFor(9999), shippingFor(10000), shippingFor(25000)]).toEqual([
      0, 799, 0, 0,
    ]);
  });
  it('clamps quantities to 1..min(stock, 10)', () => {
    expect([0, -2, 1.7, 'abc', 4, 50].map((q) => clampQuantity(q, 25))).toEqual([
      1, 1, 1, 1, 4, 10,
    ]);
    expect(clampQuantity(9, 3)).toBe(3);
  });
  it('says how much more buys free shipping', () => {
    expect(totals([{ unitPrice: 2400, quantity: 1 }]).freeShippingRemaining).toBe(7600);
  });
});

describe('pure cart functions', () => {
  const start = freeze(addToCart(EMPTY_CART, byId.smartwatch, 1));
  it('add: a new line, then more of the same line (same object never changed)', () => {
    const twice = addToCart(start, byId.smartwatch, 2);
    expect(twice.lines[0].quantity).toBe(3);
    expect(start.lines[0].quantity).toBe(1);
  });
  it('update quantity, remove, clear', () => {
    expect(updateQuantity(start, 'smartwatch', 5).lines[0].quantity).toBe(5);
    expect(removeFromCart(start, 'smartwatch').lines).toEqual([]);
    expect(clearCart(start).lines).toEqual([]);
  });
  it('refuses out-of-stock products and explains why', () => {
    const hub = byId['usb-c-hub'];
    expect(canAdd(EMPTY_CART, hub).ok).toBe(false);
    expect(canAdd(EMPTY_CART, hub).reason).toContain('Out of stock');
    expect(addToCart(EMPTY_CART, hub, 1)).toBe(EMPTY_CART);
  });
  it('refuses more than the stock allows (desk lamp: 3 in stock)', () => {
    const full = addToCart(EMPTY_CART, byId['desk-lamp'], 3);
    expect(canAdd(full, byId['desk-lamp']).ok).toBe(false);
    expect(addToCart(EMPTY_CART, byId['desk-lamp'], 9).lines[0].quantity).toBe(3);
  });
});

describe('stored data and catalog sync', () => {
  it('rehydrate keeps only well-formed lines and clamps quantities', () => {
    const stored = {
      lines: [
        { productId: 'a', name: 'A', unitPrice: 100, quantity: 50, stock: 4 },
        { productId: 'b' },
        null,
      ],
    };
    expect(rehydrate(stored).lines.map((l) => [l.productId, l.quantity])).toEqual([['a', 4]]);
    expect(rehydrate('garbage')).toEqual({ lines: [] });
  });
  it('sync applies new prices and stock; a missing product becomes unavailable', () => {
    const cart = freeze({
      lines: [{ ...addToCart(EMPTY_CART, byId.smartwatch, 2).lines[0], unitPrice: 100 }],
    });
    expect(priceChanges(cart.lines, { smartwatch: byId.smartwatch })).toEqual([
      { name: 'Ergonomic Smartwatch', from: 100, to: 14999, currency: 'USD' },
    ]);
    expect(syncWithCatalog(cart, { smartwatch: byId.smartwatch }).lines[0].unitPrice).toBe(14999);
    const gone = syncWithCatalog(cart, { smartwatch: null });
    expect([gone.lines[0].stock, availableLines(gone).length]).toEqual([0, 0]);
    expect(syncWithCatalog(cart, {})).toBe(cart);
  });
});
