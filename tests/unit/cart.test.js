/**
 * Unit tests for the cart: pure functions (deep-frozen inputs, so a mutation would throw), totals and
 * currency formatting against the fixture reference calculations, the shipping rule, quantity bounds
 * (0, above stock, above the limit), out-of-stock refusal, the reducer and badge/page agreement.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PRODUCTS } from '../../mock-server/data.mjs';
import { formatMoney } from '../../src/utils/money.js';
import { MAX_PER_LINE, shippingFor, totals, validateQuantity } from '../../src/utils/cart-math.js';
import {
  addToCart,
  canAdd,
  cartReducer,
  cartSummary,
  clearCart,
  EMPTY_CART,
  priceChanges,
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

/** Build a cart from fixture lines with the pure functions only. */
function cartFrom(lines) {
  return lines.reduce(
    (cart, { productId, quantity }) => addToCart(freeze(cart), byId[productId], quantity),
    EMPTY_CART,
  );
}

describe('totals and formatting match the fixture reference calculations', () => {
  for (const c of fixtures.cases) {
    it(c.name, () => {
      const t = totals(cartFrom(c.lines).lines);
      expect(t.itemCount).toBe(c.expected.itemCount);
      for (const key of ['subtotal', 'shipping', 'total']) {
        expect(Math.abs(t[key] / 100 - c.expected[key]) <= fixtures.tolerance).toBe(true);
        expect(formatMoney(t[key], 'USD')).toBe(c.formatted[key]);
      }
    });
  }
});

describe('shipping rule', () => {
  it('charges $7.99 below $100.00, nothing from $100.00, nothing for an empty cart', () => {
    expect([shippingFor(0), shippingFor(9999), shippingFor(10000), shippingFor(25000)]).toEqual([
      0, 799, 0, 0,
    ]);
  });
  it('says how much more buys free shipping', () => {
    expect(totals([{ unitPrice: 2400, quantity: 1 }]).freeShippingRemaining).toBe(7600);
  });
});

describe('quantity bounds: 0, above stock, above the limit', () => {
  it('validateQuantity explains every correction', () => {
    expect(validateQuantity(0, 25)).toEqual({
      quantity: 1,
      status: 'min',
      message: 'The smallest quantity is 1.',
    });
    expect(validateQuantity(-3, 25).status).toBe('min');
    expect(validateQuantity(9, 3)).toEqual({
      quantity: 3,
      status: 'stock',
      message: 'Only 3 in stock.',
    });
    expect(validateQuantity(25, 25)).toEqual({
      quantity: MAX_PER_LINE,
      status: 'limit',
      message: 'The limit is 10 per item.',
    });
    expect(validateQuantity('abc', 25).status).toBe('invalid');
    expect(validateQuantity(2.7, 25)).toEqual({ quantity: 2, status: 'ok', message: '' });
    expect(validateQuantity(1, 0).status).toBe('out');
  });
  const start = freeze(addToCart(EMPTY_CART, byId.smartwatch, 2));
  it('setting a quantity to 0 (or less) removes the line', () => {
    expect(updateQuantity(start, 'smartwatch', 0).lines).toEqual([]);
    expect(updateQuantity(start, 'smartwatch', -1).lines).toEqual([]);
  });
  it('above the stock is reduced to the stock (desk lamp: 3)', () => {
    expect(addToCart(EMPTY_CART, byId['desk-lamp'], 9).lines[0].quantity).toBe(3);
    const lamp = freeze(addToCart(EMPTY_CART, byId['desk-lamp'], 1));
    expect(updateQuantity(lamp, 'desk-lamp', 50).lines[0].quantity).toBe(3);
  });
  it('above the limit is reduced to 10', () => {
    expect(addToCart(EMPTY_CART, byId['headphones-pro'], 25).lines[0].quantity).toBe(10);
    expect(updateQuantity(start, 'smartwatch', 11).lines[0].quantity).toBe(10);
  });
  it('adding 0 is refused with a reason', () => {
    expect(canAdd(EMPTY_CART, byId.smartwatch, 0)).toEqual({
      ok: false,
      reason: 'Choose a quantity of at least 1.',
    });
    expect(addToCart(EMPTY_CART, byId.smartwatch, 0)).toBe(EMPTY_CART);
  });
});

describe('out of stock', () => {
  it('cannot be added, and canAdd explains why', () => {
    const hub = byId['usb-c-hub'];
    expect(canAdd(EMPTY_CART, hub)).toEqual({
      ok: false,
      reason: 'Out of stock: this item cannot be added to the cart right now.',
    });
    expect(addToCart(EMPTY_CART, hub, 1)).toBe(EMPTY_CART);
  });
  it('cannot go beyond what is in stock across several adds', () => {
    const full = freeze(addToCart(EMPTY_CART, byId['desk-lamp'], 3));
    expect(canAdd(full, byId['desk-lamp']).reason).toContain('the most we can sell');
    expect(addToCart(full, byId['desk-lamp'], 1)).toBe(full);
  });
});

describe('pure cart functions and the reducer', () => {
  const start = freeze(addToCart(EMPTY_CART, byId.smartwatch, 1));
  it('return new states and never change the old one', () => {
    const more = addToCart(start, byId.smartwatch, 2);
    expect([more.lines[0].quantity, start.lines[0].quantity]).toEqual([3, 1]);
    expect(removeFromCart(start, 'smartwatch').lines).toEqual([]);
    expect(clearCart(start).lines).toEqual([]);
  });
  it('cartReducer dispatches the same functions', () => {
    let state = cartReducer(EMPTY_CART, { type: 'add', product: byId.smartwatch, quantity: 2 });
    state = cartReducer(freeze(state), { type: 'update', productId: 'smartwatch', quantity: 4 });
    expect(state.lines[0].quantity).toBe(4);
    expect(cartReducer(freeze(state), { type: 'remove', productId: 'smartwatch' }).lines).toEqual(
      [],
    );
    expect(cartReducer(state, { type: 'unknown' })).toBe(state);
  });
  it('the badge and the page use one summary: out-of-stock lines are neither counted nor charged', () => {
    const cart = freeze(
      syncWithCatalog(
        addToCart(addToCart(EMPTY_CART, byId.smartwatch, 2), byId['card-wallet'], 1),
        { 'card-wallet': { ...byId['card-wallet'], stock: 0 } },
      ),
    );
    const summary = cartSummary(cart);
    expect([summary.itemCount, summary.subtotal, summary.currency]).toEqual([2, 29998, 'USD']);
  });
  it('sync applies new prices and stock; a missing product becomes unavailable', () => {
    const cart = freeze({
      lines: [{ ...addToCart(EMPTY_CART, byId.smartwatch, 2).lines[0], unitPrice: 100 }],
    });
    expect(priceChanges(cart.lines, { smartwatch: byId.smartwatch })).toEqual([
      { name: 'Ergonomic Smartwatch', from: 100, to: 14999, currency: 'USD' },
    ]);
    expect(syncWithCatalog(cart, { smartwatch: byId.smartwatch }).lines[0].unitPrice).toBe(14999);
    expect(syncWithCatalog(cart, { smartwatch: null }).lines[0].stock).toBe(0);
    expect(syncWithCatalog(cart, {})).toBe(cart);
  });
});
