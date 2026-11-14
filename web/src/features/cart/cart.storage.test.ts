/** Versioned persistence: envelope, migration from the legacy v1 cart, repair, newer versions, blocked storage. */
import { describe, expect, it } from 'vitest';
import type { CartItem } from '@shared/domain';
import { EMPTY_CART } from './cart.reducer';
import {
  CART_STORAGE_KEY,
  CART_STORAGE_VERSION,
  LEGACY_CART_KEY,
  loadCart,
  parseStoredCart,
  saveCart,
  serializeCart,
} from './cart.storage';

const line: CartItem = {
  productId: 'p-001',
  name: 'Nova Laptops 1',
  unitPrice: 3_299_900,
  currency: 'EGP',
  quantity: 2,
  stock: 25,
  image: { url: '/product-placeholder.svg', alt: 'Nova Laptops 1' },
};

describe('cart storage', () => {
  it('saves a versioned envelope and reads it back unchanged', () => {
    const text = serializeCart({ lines: [line] }, new Date('2026-11-14T10:00:00Z'));
    expect(JSON.parse(text)).toEqual({
      version: CART_STORAGE_VERSION,
      savedAt: '2026-11-14T10:00:00.000Z',
      lines: [line],
    });
    expect(parseStoredCart(text)).toEqual({
      status: 'loaded',
      state: { lines: [line] },
      fromVersion: 2,
      repaired: false,
    });
  });

  it('migrates the legacy v1 cart ({ lines }, no version) when the new key is empty', () => {
    window.localStorage.setItem(LEGACY_CART_KEY, JSON.stringify({ lines: [line] }));
    const result = loadCart(window.localStorage);
    expect(result).toMatchObject({ status: 'loaded', fromVersion: 1, state: { lines: [line] } });
    window.localStorage.setItem(CART_STORAGE_KEY, serializeCart(EMPTY_CART, new Date()));
    expect(loadCart(window.localStorage).state).toEqual(EMPTY_CART); // the new key wins once it exists
  });

  it('repairs what it reads: drops bad lines, caps quantities, merges duplicates', () => {
    const text = JSON.stringify({
      version: 2,
      lines: [
        line,
        { ...line, quantity: 3 },
        { ...line, productId: 'p-002', quantity: 40, stock: 3 },
        { ...line, productId: 'p-003', unitPrice: 'free' },
        { productId: 7 },
        null,
      ],
    });
    const result = parseStoredCart(text);
    expect(result).toMatchObject({ status: 'loaded', repaired: true });
    expect(result.state.lines.map((l) => [l.productId, l.quantity])).toEqual([
      ['p-001', 5],
      ['p-002', 3],
    ]);
  });

  it('does not guess at a newer version, and treats garbage as unreadable', () => {
    expect(parseStoredCart(JSON.stringify({ version: 3, lines: [line] }))).toEqual({
      status: 'newer-version',
      state: EMPTY_CART,
      version: 3,
    });
    expect(parseStoredCart('{oops').status).toBe('unreadable');
    expect(parseStoredCart('[]').status).toBe('unreadable');
    expect(parseStoredCart(null).status).toBe('empty');
  });

  it('keeps working when storage throws', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    } as unknown as Storage;
    expect(loadCart(broken).state).toEqual(EMPTY_CART);
    expect(saveCart(broken, { lines: [line] })).toBe(false);
  });
});
