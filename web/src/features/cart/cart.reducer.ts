/**
 * The cart reducer: the ONLY code that produces a new cart state.
 *
 * Rules it guarantees (each one is a test in cart.reducer.test.ts):
 * - Pure: no storage, network, time or randomness. The same state and action always give the same result, and
 *   the input state is never mutated (the tests freeze it). Persistence lives in cart.storage.ts and the
 *   provider (CartContext.tsx); totals live in cart.selectors.ts and are derived, never stored.
 * - One line per product. A quantity is a whole number from 1 to `maxQuantity(line)`: the stock and the
 *   per-line limit (10). Setting 0 removes the line; a quantity that cannot change returns the SAME state
 *   object, so React skips the re-render and the save.
 * - A line keeps a snapshot of the product (name, price in integer cents, image, stock), so the cart renders
 *   from storage before any request. `reprice` replaces the snapshot with what the API says now.
 *
 * Who dispatches what: the product page `add`; the cart page `update`, `remove`, `clear`; the checkout `clear`
 * after the order is placed; the provider `hydrate` (another tab saved the cart) and `reprice` (on load).
 */
import type { CartItem, Product } from '@shared/domain';

/** The most of one product a cart line may hold (legacy MAX_PER_LINE). */
export const MAX_PER_LINE = 10;

export interface CartState {
  readonly lines: readonly CartItem[];
}

export type CartAction =
  /** Add `quantity` of a product (merged into its line; capped by stock and the per-line limit). */
  | { type: 'add'; product: Product; quantity: number }
  /** Set a line's quantity (capped; 0 or less removes the line). */
  | { type: 'update'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' }
  /** Replace the whole cart with an already-validated state (another tab changed it). */
  | { type: 'hydrate'; state: CartState }
  /**
   * Fresh product data for the lines: new price, name, image and stock; quantities are capped to the new
   * stock (a line whose product is now out of stock is kept with stock 0, shown and not charged); lines whose
   * product no longer exists (404) are removed.
   */
  | { type: 'reprice'; products: readonly Product[]; missing: readonly string[] };

export const EMPTY_CART: CartState = Object.freeze({
  lines: Object.freeze([]) as readonly CartItem[],
});

/** The most a line may hold: its stock and the per-line limit (at least 1 while the line exists). */
export function maxQuantity(stock: number): number {
  return Math.max(0, Math.min(Math.floor(stock), MAX_PER_LINE));
}

/** Whole items, at least 0, at most the stock and the per-line limit. */
export function clampQuantity(quantity: number, available: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, Math.min(Math.floor(quantity), maxQuantity(available)));
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

function withLine(state: CartState, productId: string, line: CartItem | null): CartState {
  const exists = state.lines.some((l) => l.productId === productId);
  if (line === null) return { lines: state.lines.filter((l) => l.productId !== productId) };
  return {
    lines: exists
      ? state.lines.map((l) => (l.productId === productId ? line : l))
      : [...state.lines, line],
  };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      const { product } = action;
      if (!Number.isFinite(product.price) || action.quantity <= 0) return state;
      const existing = state.lines.find((l) => l.productId === product.id);
      const quantity = clampQuantity(
        (existing?.quantity ?? 0) + Math.floor(action.quantity),
        product.stock.available,
      );
      if (quantity === 0 || quantity === existing?.quantity) return state;
      return withLine(state, product.id, toCartItem(product, quantity));
    }

    case 'update': {
      const line = state.lines.find((l) => l.productId === action.productId);
      if (!line) return state;
      if (!Number.isFinite(action.quantity) || action.quantity <= 0)
        return withLine(state, line.productId, null);
      const quantity = clampQuantity(action.quantity, line.stock);
      if (quantity === line.quantity || quantity === 0) return state;
      return withLine(state, line.productId, { ...line, quantity });
    }

    case 'remove':
      return state.lines.some((l) => l.productId === action.productId)
        ? withLine(state, action.productId, null)
        : state;

    case 'clear':
      return state.lines.length === 0 ? state : EMPTY_CART;

    case 'hydrate':
      return action.state;

    case 'reprice': {
      const fresh = new Map(action.products.map((p) => [p.id, p]));
      const gone = new Set(action.missing);
      const lines = state.lines.flatMap((line): CartItem[] => {
        if (gone.has(line.productId)) return [];
        const product = fresh.get(line.productId);
        if (!product || !Number.isFinite(product.price)) return [line];
        const stock = product.stock.available;
        const quantity =
          stock > 0 ? Math.max(1, clampQuantity(line.quantity, stock)) : line.quantity;
        return [{ ...toCartItem(product, quantity), stock }];
      });
      return { lines };
    }
  }
}
