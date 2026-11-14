/** The reducer is pure and the single writer: every action, no mutation, same object when nothing changes. */
import { describe, expect, it } from 'vitest';
import type { Product } from '@shared/domain';
import {
  cartReducer,
  EMPTY_CART,
  MAX_PER_LINE,
  type CartAction,
  type CartState,
} from './cart.reducer';

function product(id: string, overrides: Partial<Product> = {}): Product {
  return {
    id,
    name: `Product ${id}`,
    brand: 'Nova',
    category: 'laptops',
    price: 249_900,
    currency: 'EGP',
    stock: { status: 'in_stock', available: 25 },
    rating: 4,
    reviewCount: 10,
    images: [{ url: '/product-placeholder.svg', alt: `Product ${id}` }],
    specs: [],
    ...overrides,
  };
}

/** Deep-freeze, so any mutation inside the reducer throws in strict mode. */
function frozen(state: CartState): CartState {
  state.lines.forEach((l) => Object.freeze(l));
  Object.freeze(state.lines);
  return Object.freeze(state);
}

const run = (actions: CartAction[], start: CartState = EMPTY_CART) =>
  actions.reduce((s, a) => cartReducer(frozen(s), a), start);

describe('cartReducer', () => {
  it('add: creates a line with a snapshot of the product, then merges into it', () => {
    const state = run([
      { type: 'add', product: product('p-1'), quantity: 2 },
      { type: 'add', product: product('p-1'), quantity: 3 },
    ]);
    expect(state.lines).toEqual([
      expect.objectContaining({
        productId: 'p-1',
        quantity: 5,
        unitPrice: 249_900,
        stock: 25,
        name: 'Product p-1',
      }),
    ]);
  });

  it('add: caps at the stock and at the per-line limit, ignores nonsense', () => {
    const low = product('low', { stock: { status: 'low', available: 3 } });
    expect(run([{ type: 'add', product: low, quantity: 5 }]).lines[0]?.quantity).toBe(3);
    expect(run([{ type: 'add', product: product('p'), quantity: 50 }]).lines[0]?.quantity).toBe(
      MAX_PER_LINE,
    );
    const out = product('out', { stock: { status: 'out_of_stock', available: 0 } });
    expect(run([{ type: 'add', product: out, quantity: 1 }])).toBe(EMPTY_CART);
    expect(run([{ type: 'add', product: product('p'), quantity: 0 }])).toBe(EMPTY_CART);
    expect(
      run([{ type: 'add', product: product('nan', { price: Number.NaN }), quantity: 1 }]),
    ).toBe(EMPTY_CART);
  });

  it('update: sets the quantity, capped; 0 removes the line; unknown ids change nothing', () => {
    const one = run([{ type: 'add', product: product('p-1'), quantity: 1 }]);
    expect(run([{ type: 'update', productId: 'p-1', quantity: 4 }], one).lines[0]?.quantity).toBe(
      4,
    );
    expect(run([{ type: 'update', productId: 'p-1', quantity: 99 }], one).lines[0]?.quantity).toBe(
      MAX_PER_LINE,
    );
    expect(run([{ type: 'update', productId: 'p-1', quantity: 0 }], one)).toEqual(EMPTY_CART);
    expect(run([{ type: 'update', productId: 'nope', quantity: 2 }], one)).toBe(one);
  });

  it('remove and clear', () => {
    const two = run([
      { type: 'add', product: product('a'), quantity: 1 },
      { type: 'add', product: product('b'), quantity: 1 },
    ]);
    expect(run([{ type: 'remove', productId: 'a' }], two).lines.map((l) => l.productId)).toEqual([
      'b',
    ]);
    expect(run([{ type: 'remove', productId: 'zzz' }], two)).toBe(two);
    expect(run([{ type: 'clear' }], two)).toBe(EMPTY_CART);
    expect(run([{ type: 'clear' }], EMPTY_CART)).toBe(EMPTY_CART);
  });

  it('returns the same object when an action changes nothing (no re-render, no save)', () => {
    const one = run([{ type: 'add', product: product('p-1'), quantity: 2 }]);
    expect(cartReducer(one, { type: 'update', productId: 'p-1', quantity: 2 })).toBe(one);
  });

  it('is pure: never mutates its input, same input gives the same output', () => {
    const start = frozen(run([{ type: 'add', product: product('p-1'), quantity: 1 }]));
    const snapshot = JSON.stringify(start);
    const action: CartAction = { type: 'add', product: product('p-2'), quantity: 1 };
    const first = cartReducer(start, action);
    const second = cartReducer(start, action);
    expect(JSON.stringify(start)).toBe(snapshot);
    expect(first).toEqual(second);
    expect(first).not.toBe(start);
  });

  it('reprice: new price and stock, quantities capped, removed products dropped, out of stock kept', () => {
    const cart = run([
      { type: 'add', product: product('cheaper'), quantity: 5 },
      { type: 'add', product: product('gone'), quantity: 1 },
      { type: 'add', product: product('sold-out'), quantity: 2 },
      { type: 'add', product: product('unreachable'), quantity: 1 },
    ]);
    const next = cartReducer(frozen(cart), {
      type: 'reprice',
      products: [
        product('cheaper', { price: 199_900, stock: { status: 'low', available: 3 } }),
        product('sold-out', { stock: { status: 'out_of_stock', available: 0 } }),
      ],
      missing: ['gone'],
    });
    expect(next.lines.map((l) => [l.productId, l.quantity, l.unitPrice, l.stock])).toEqual([
      ['cheaper', 3, 199_900, 3],
      ['sold-out', 2, 249_900, 0],
      ['unreachable', 1, 249_900, 25],
    ]);
  });

  it('hydrate: takes the given state as it is', () => {
    const other = run([{ type: 'add', product: product('x'), quantity: 1 }]);
    expect(cartReducer(EMPTY_CART, { type: 'hydrate', state: other })).toBe(other);
  });
});
