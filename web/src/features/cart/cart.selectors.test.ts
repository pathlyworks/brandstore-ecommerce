/**
 * Totals against reference calculations made outside the app (cart-reference.json, exact decimal arithmetic
 * in web/scripts/cart-reference.mjs): TechSphere products exactly as the API sends them (number and string
 * prices, low stock, missing stock_status, out of stock) and the Phase 2 reference cases.
 */
import { describe, expect, it } from 'vitest';
import type { CartItem, Product } from '@shared/domain';
import { toProduct } from '../../api/mappers';
import { products as apiProducts } from '../../test/fixtures';
import reference from './cart-reference.json';
import { cartReducer, EMPTY_CART, type CartState } from './cart.reducer';
import {
  FREE_SHIPPING_FROM,
  selectOrderItems,
  selectTotals,
  shippingFor,
  SHIPPING_FEE,
} from './cart.selectors';

interface RefLine {
  productId: string;
  quantity: number;
  name?: string;
  price?: string;
  stock?: number;
}
interface RefCase {
  name: string;
  source: string;
  lines: RefLine[];
  expected: { itemCount: number; subtotal: number; shipping: number; total: number };
}
const cases = reference.cases as RefCase[];

function cartFor(c: RefCase): CartState {
  return c.lines.reduce<CartState>((state, line) => {
    let product: Product;
    if (c.source === 'techsphere') {
      const raw = apiProducts.find((p) => p.id === line.productId);
      if (!raw) throw new Error(`no captured product ${line.productId}`);
      product = toProduct(raw);
    } else {
      product = {
        id: line.productId,
        name: line.name ?? line.productId,
        brand: '',
        category: 'laptops',
        // Decimal text → cents by string, independent of the selectors under test.
        price: Number((line.price ?? '0').replace('.', '')),
        currency: 'EGP',
        stock: { status: 'in_stock', available: line.stock ?? 25 },
        rating: 0,
        reviewCount: 0,
        images: [{ url: '/x.svg', alt: '' }],
        specs: [],
      };
    }
    return cartReducer(state, { type: 'add', product, quantity: line.quantity });
  }, EMPTY_CART);
}

describe('selectTotals against the reference calculations', () => {
  it.each(cases.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const totals = selectTotals(cartFor(c));
    const tolerance = reference.tolerance;
    expect(totals.itemCount).toBe(c.expected.itemCount);
    expect(Math.abs(totals.subtotal / 100 - c.expected.subtotal)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(totals.shipping / 100 - c.expected.shipping)).toBeLessThanOrEqual(tolerance);
    expect(Math.abs(totals.total / 100 - c.expected.total)).toBeLessThanOrEqual(tolerance);
    expect(Number.isInteger(totals.total)).toBe(true); // cents, never fractions
  });
});

describe('shipping and order lines', () => {
  it('free from the threshold, flat fee below it, nothing for an empty cart', () => {
    expect(shippingFor(0)).toBe(0);
    expect(shippingFor(FREE_SHIPPING_FROM - 1)).toBe(SHIPPING_FEE);
    expect(shippingFor(FREE_SHIPPING_FROM)).toBe(0);
  });

  it('orders only the chargeable lines, as { productId, qty }', () => {
    const line = (productId: string, stock: number): CartItem => ({
      productId,
      name: productId,
      unitPrice: 1000,
      currency: 'EGP',
      quantity: 2,
      stock,
      image: { url: '/x.svg', alt: '' },
    });
    const totals = selectTotals({ lines: [line('a', 5), line('b', 0)] });
    expect(totals.subtotal).toBe(2000);
    expect(selectOrderItems({ lines: [line('a', 5), line('b', 0)] })).toEqual([
      { productId: 'a', qty: 2 },
    ]);
  });
});
