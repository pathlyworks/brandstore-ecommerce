/** Test helpers: a signed-in session and a stored cart, written where the providers read them. */
import type { CartItem } from '@shared/domain';
import { STORAGE_KEYS } from '../config';
import { CART_STORAGE_KEY, serializeCart } from '../features/cart/cart.storage';
import { ADMIN, freshToken, SHOPPER } from './fixtures';

/** A stored session, as AuthProvider reads it on load. `ttlSeconds` below 0 stores an already expired one. */
export function signInForTest(
  options: { role?: 'shopper' | 'admin'; ttlSeconds?: number; email?: string } = {},
): void {
  const {
    role = 'shopper',
    ttlSeconds = 3600,
    email = role === 'admin' ? ADMIN.email : SHOPPER.email,
  } = options;
  window.sessionStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify({
      token: freshToken(email, Date.now(), role, ttlSeconds),
      expiresAt: Date.now() + ttlSeconds * 1000,
      user: { email, name: role === 'admin' ? 'Admin' : 'Student Shopper', role },
    }),
  );
}

export function cartLine(overrides: Partial<CartItem> = {}): CartItem {
  return {
    productId: 'p-001',
    name: 'Nova Laptops 1',
    unitPrice: 3_299_900,
    currency: 'EGP',
    quantity: 1,
    stock: 25,
    image: { url: '/product-placeholder.svg', alt: 'Nova Laptops 1' },
    ...overrides,
  };
}

export function storeCart(lines: CartItem[]): void {
  window.localStorage.setItem(CART_STORAGE_KEY, serializeCart({ lines }, new Date()));
}
