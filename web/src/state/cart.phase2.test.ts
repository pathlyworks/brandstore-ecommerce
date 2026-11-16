/**
 * The Phase 2 cart tests (tests/unit/cart.test.js, written for the vanilla site's src/state/cart.js), ported to
 * the React app's reducer: the same catalog, the same Python-computed reference totals
 * (tests/fixtures/cart-cases.json), the same shipping rule, quantity bounds, out-of-stock refusal, purity and
 * badge/page agreement, now through cartReducer actions and the selectors.
 *
 * What changed in the port, and why:
 * - Phase 2 had separate functions (addToCart, updateQuantity, ...); here every change is an action.
 * - Phase 2 refused an add with a reason (canAdd); the reducer returns the same state, and the product page shows
 *   the reason. "Refused" is therefore asserted as "the state object did not change".
 * - Phase 2 marked a vanished product unavailable (stock 0); the reducer's `reprice` removes it, and the cart page
 *   tells the shopper (CartRoute). The ported test asserts the reducer's rule.
 * - Prices are in USD in the Phase 2 catalog; the React app is EGP-only, so the lines are built with currency EGP:
 *   the arithmetic is currency-independent, and display formatting is covered by lib/money tests.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Product } from '@shared/domain';
import {
  cartReducer,
  EMPTY_CART,
  MAX_PER_LINE,
  type CartAction,
  type CartState,
} from './cart.reducer';
import { FREE_SHIPPING_FROM, selectItemCount, selectTotals, shippingFor } from './cart.selectors';

// The Phase 2 catalog (mock-server/data.mjs): id, name, price in cents, stock.
const CATALOG: [string, string, number, number][] = [
  ['headphones-pro', 'Wireless Headphones Pro', 19999, 25],
  ['smartwatch', 'Ergonomic Smartwatch', 14999, 25],
  ['leather-backpack', 'Minimalist Leather Backpack', 8999, 25],
  ['bluetooth-speaker', 'Portable Bluetooth Speaker', 5999, 25],
  ['usb-c-hub', 'USB-C 7-in-1 Hub', 3999, 0],
  ['merino-tee', 'Merino Crew T-Shirt', 4500, 25],
  ['rain-shell', 'Packable Rain Shell', 11900, 25],
  ['wool-socks', 'Trail Wool Socks (3 pack)', 2400, 25],
  ['ceramic-mug', 'Stoneware Mug Set', 3200, 25],
  ['desk-lamp', 'Adjustable LED Desk Lamp', 6450, 3],
  ['linen-throw', 'Linen Throw Blanket', 7800, 25],
  ['card-wallet', 'Slim Card Wallet', 2999, 25],
];

function toProduct([id, name, price, stock]: [string, string, number, number]): Product {
  return {
    id,
    name,
    brand: 'Phase 2',
    category: 'audio',
    price,
    currency: 'EGP',
    stock: { status: stock > 0 ? 'in_stock' : 'out_of_stock', available: stock },
    rating: 4.5,
    reviewCount: 1,
    images: [{ url: '/product-placeholder.svg', alt: name }],
    specs: [],
  };
}
const byId = Object.fromEntries(CATALOG.map((row) => [row[0], toProduct(row)])) as Record<
  string,
  Product
>;
const p = (id: string): Product => {
  const product = byId[id];
  if (!product) throw new Error(`no product ${id}`);
  return product;
};

/** Deep-freeze, so a mutation inside the reducer throws (as in Phase 2). */
function frozen(state: CartState): CartState {
  state.lines.forEach((l) => Object.freeze(l));
  Object.freeze(state.lines);
  return Object.freeze(state);
}
const run = (actions: CartAction[], start: CartState = EMPTY_CART) =>
  actions.reduce((s, a) => cartReducer(frozen(s), a), start);
const add = (id: string, quantity = 1): CartAction => ({ type: 'add', product: p(id), quantity });

interface Fixture {
  tolerance: number;
  cases: {
    name: string;
    lines: { productId: string; quantity: number }[];
    expected: { itemCount: number; subtotal: number; shipping: number; total: number };
  }[];
}
const fixtures = JSON.parse(
  readFileSync(resolve(__dirname, '../../../tests/fixtures/cart-cases.json'), 'utf8'),
) as Fixture;

describe('Phase 2 port: totals match the fixture reference calculations', () => {
  for (const c of fixtures.cases) {
    it(c.name, () => {
      const t = selectTotals(run(c.lines.map((l) => add(l.productId, l.quantity))));
      expect(t.itemCount).toBe(c.expected.itemCount);
      for (const key of ['subtotal', 'shipping', 'total'] as const) {
        expect(Math.abs(t[key] / 100 - c.expected[key])).toBeLessThanOrEqual(fixtures.tolerance);
      }
    });
  }
});

describe('Phase 2 port: shipping rule', () => {
  it('charges 7.99 below 100.00, nothing from 100.00, nothing for an empty cart', () => {
    expect([shippingFor(0), shippingFor(9999), shippingFor(10000), shippingFor(25000)]).toEqual([
      0, 799, 0, 0,
    ]);
  });

  it('says how much more buys free shipping', () => {
    expect(selectTotals(run([add('wool-socks')])).freeShippingRemaining).toBe(
      FREE_SHIPPING_FROM - 2400,
    );
  });
});

describe('Phase 2 port: quantity bounds (0, above stock, above the limit)', () => {
  const start = run([add('smartwatch', 2)]);

  it('setting a quantity to 0 (or less) removes the line', () => {
    expect(run([{ type: 'update', productId: 'smartwatch', quantity: 0 }], start).lines).toEqual(
      [],
    );
    expect(run([{ type: 'update', productId: 'smartwatch', quantity: -1 }], start).lines).toEqual(
      [],
    );
  });

  it('above the stock is reduced to the stock (desk lamp: 3)', () => {
    expect(run([add('desk-lamp', 9)]).lines[0]?.quantity).toBe(3);
    expect(
      run([add('desk-lamp'), { type: 'update', productId: 'desk-lamp', quantity: 50 }]).lines[0]
        ?.quantity,
    ).toBe(3);
  });

  it(`above the limit is reduced to ${MAX_PER_LINE}`, () => {
    expect(run([add('headphones-pro', 25)]).lines[0]?.quantity).toBe(MAX_PER_LINE);
    expect(
      run([{ type: 'update', productId: 'smartwatch', quantity: 11 }], start).lines[0]?.quantity,
    ).toBe(MAX_PER_LINE);
  });

  it('adding 0 is refused (the state does not change)', () => {
    expect(cartReducer(EMPTY_CART, add('smartwatch', 0))).toBe(EMPTY_CART);
  });

  it('a fractional quantity is rounded down (2.7 → 2)', () => {
    expect(run([add('smartwatch', 2.7)]).lines[0]?.quantity).toBe(2);
  });
});

describe('Phase 2 port: out of stock', () => {
  it('cannot be added', () => {
    expect(cartReducer(EMPTY_CART, add('usb-c-hub'))).toBe(EMPTY_CART);
  });

  it('cannot go beyond what is in stock across several adds', () => {
    const full = run([add('desk-lamp', 3)]);
    expect(cartReducer(frozen(full), add('desk-lamp'))).toBe(full);
  });
});

describe('Phase 2 port: pure reducer, one summary for badge and page', () => {
  it('returns new states and never changes the old one', () => {
    const start = run([add('smartwatch')]);
    const more = cartReducer(start, add('smartwatch', 2));
    expect([more.lines[0]?.quantity, start.lines[0]?.quantity]).toEqual([3, 1]);
    expect(cartReducer(start, { type: 'remove', productId: 'smartwatch' }).lines).toEqual([]);
    expect(cartReducer(start, { type: 'clear' }).lines).toEqual([]);
  });

  it('add → update → remove through the reducer', () => {
    let state = run([
      add('smartwatch', 2),
      { type: 'update', productId: 'smartwatch', quantity: 4 },
    ]);
    expect(state.lines[0]?.quantity).toBe(4);
    state = run([{ type: 'remove', productId: 'smartwatch' }], state);
    expect(state.lines).toEqual([]);
  });

  it('the badge and the page use one summary: out-of-stock lines are neither counted nor charged', () => {
    const cart = run([
      add('smartwatch', 2),
      add('card-wallet'),
      {
        type: 'reprice',
        products: [{ ...p('card-wallet'), stock: { status: 'out_of_stock', available: 0 } }],
        missing: [],
      },
    ]);
    const totals = selectTotals(cart);
    expect([selectItemCount(cart), totals.itemCount, totals.subtotal]).toEqual([2, 2, 29998]);
    expect(cart.lines).toHaveLength(2); // kept in the cart, shown as unavailable
  });

  it('reprice applies new prices and stock; a product the API no longer has is removed', () => {
    const cart = run([add('smartwatch', 2)]);
    const cheaper = run(
      [{ type: 'reprice', products: [{ ...p('smartwatch'), price: 100 }], missing: [] }],
      cart,
    );
    expect(cheaper.lines[0]?.unitPrice).toBe(100);
    expect(run([{ type: 'reprice', products: [], missing: ['smartwatch'] }], cart).lines).toEqual(
      [],
    );
  });
});
