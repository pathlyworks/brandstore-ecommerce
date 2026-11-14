import { describe, expect, it } from 'vitest';
import type { Product } from '@shared/domain';
import { cartReducer, cartTotals, EMPTY_CART, MAX_PER_LINE, rehydrate } from './cart.reducer';

const product: Product = {
  id: 'p-001',
  name: 'Nova Laptops 1',
  brand: 'Nova',
  category: 'laptops',
  price: 3_299_900,
  currency: 'EGP',
  stock: { status: 'low_stock', available: 3 },
  rating: 3,
  reviewCount: 10,
  images: [{ url: '/product-placeholder.svg', alt: 'Nova Laptops 1' }],
  specs: [],
};

describe('cartReducer', () => {
  it('adds, merges lines and caps at the stock', () => {
    let state = cartReducer(EMPTY_CART, { type: 'add', product, quantity: 2 });
    state = cartReducer(state, { type: 'add', product, quantity: 5 });
    expect(state.lines).toHaveLength(1);
    expect(state.lines[0]?.quantity).toBe(3);
  });

  it('never goes above the per-line limit', () => {
    const plenty = { ...product, stock: { status: 'in_stock' as const, available: 25 } };
    const state = cartReducer(EMPTY_CART, { type: 'add', product: plenty, quantity: 50 });
    expect(state.lines[0]?.quantity).toBe(MAX_PER_LINE);
  });

  it('removes a line when its quantity is set to 0, and clears', () => {
    const state = cartReducer(EMPTY_CART, { type: 'add', product, quantity: 1 });
    expect(
      cartReducer(state, { type: 'setQuantity', productId: 'p-001', quantity: 0 }).lines,
    ).toEqual([]);
    expect(cartReducer(state, { type: 'clear' })).toEqual(EMPTY_CART);
  });

  it('totals in integer cents', () => {
    const state = cartReducer(EMPTY_CART, { type: 'add', product, quantity: 2 });
    expect(cartTotals(state)).toEqual({ itemCount: 2, subtotal: 6_599_800, currency: 'EGP' });
  });

  it('drops malformed stored data', () => {
    expect(rehydrate(null)).toEqual(EMPTY_CART);
    expect(rehydrate({ lines: [{ productId: 1 }] })).toEqual(EMPTY_CART);
  });
});
