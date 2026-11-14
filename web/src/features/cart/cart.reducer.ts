/**
 * The cart reducer: pure, no storage or network (task_1_architecture.md §5). Lines keep a snapshot of the
 * product (name, price in cents, image, availability) so the cart renders before any request, and the stored
 * shape is the legacy one ({ lines: CartItem[] } under "brandstore:cart:v1"), so legacy pages and the React app
 * share the same cart while both are live.
 */
import type { CartItem, Product } from '@shared/domain';

/** The most of one product a cart line may hold (legacy MAX_PER_LINE). */
export const MAX_PER_LINE = 10;

export interface CartState {
  lines: CartItem[];
}

export type CartAction =
  | { type: 'add'; product: Product; quantity: number }
  | { type: 'setQuantity'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' }
  | { type: 'replace'; state: CartState };

export const EMPTY_CART: CartState = { lines: [] };

/** Whole items, at least 0, at most the stock and the per-line limit. */
export function clampQuantity(quantity: number, available: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, Math.min(Math.floor(quantity), available, MAX_PER_LINE));
}

export function toCartItem(product: Product, quantity: number): CartItem {
  return {
    productId: product.id,
    name: product.name,
    unitPrice: product.price,
    currency: product.currency,
    quantity,
    stock: product.stock.available,
    image: product.images[0],
  };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const { product } = action;
      const existing = state.lines.find((l) => l.productId === product.id);
      const quantity = clampQuantity(
        (existing?.quantity ?? 0) + action.quantity,
        product.stock.available,
      );
      if (quantity === 0 || quantity === existing?.quantity) return state;
      const line = { ...toCartItem(product, quantity) };
      return {
        lines: existing
          ? state.lines.map((l) => (l.productId === product.id ? line : l))
          : [...state.lines, line],
      };
    }
    case 'setQuantity': {
      const line = state.lines.find((l) => l.productId === action.productId);
      if (!line) return state;
      const quantity = clampQuantity(action.quantity, line.stock);
      if (quantity === 0)
        return { lines: state.lines.filter((l) => l.productId !== action.productId) };
      return {
        lines: state.lines.map((l) => (l.productId === action.productId ? { ...l, quantity } : l)),
      };
    }
    case 'remove':
      return { lines: state.lines.filter((l) => l.productId !== action.productId) };
    case 'clear':
      return EMPTY_CART;
    case 'replace':
      return action.state;
  }
}

/** Derived, never stored: the header badge and the summary read the same numbers. */
export function cartTotals(state: CartState): {
  itemCount: number;
  subtotal: number;
  currency: string;
} {
  return {
    itemCount: state.lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: state.lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
    currency: state.lines[0]?.currency ?? 'EGP',
  };
}

/** Stored data back into a cart: anything malformed is dropped, never trusted. */
export function rehydrate(data: unknown): CartState {
  if (
    typeof data !== 'object' ||
    data === null ||
    !Array.isArray((data as { lines?: unknown }).lines)
  )
    return EMPTY_CART;
  const lines = (data as { lines: unknown[] }).lines.filter(isCartItem);
  return { lines };
}

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.productId === 'string' &&
    typeof v.name === 'string' &&
    typeof v.unitPrice === 'number' &&
    typeof v.quantity === 'number' &&
    v.quantity > 0 &&
    typeof v.stock === 'number' &&
    typeof v.image === 'object' &&
    v.image !== null
  );
}
