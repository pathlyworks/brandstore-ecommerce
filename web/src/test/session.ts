/** Test helpers: a signed-in session and a stored cart, written where the providers read them. */
import type { CartItem } from '@shared/domain';
import { STORAGE_KEYS } from '../config';
import { CART_STORAGE_KEY, serializeCart } from '../features/cart/cart.storage';
import { freshToken, SHOPPER } from './fixtures';

export function signInForTest(): void {
  window.sessionStorage.setItem(
    STORAGE_KEYS.session,
    JSON.stringify({
      token: freshToken(SHOPPER.email),
      expiresAt: Date.now() + 3_600_000,
      user: { email: SHOPPER.email, name: 'Student Shopper', role: 'shopper' },
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
