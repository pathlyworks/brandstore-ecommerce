/**
 * The cart reducer: pure, no storage or network (task_1_architecture.md §5). Wave 0 starts it with the line
 * operations; wave 2 ports the legacy rules from src/state/cart.js (stock and per-line limits, saved-for-later,
 * re-pricing) together with their tests.
 */
export interface CartLine {
  productId: string;
  quantity: number;
}

export interface CartState {
  lines: CartLine[];
}

export type CartAction =
  | { type: 'add'; productId: string; quantity: number }
  | { type: 'setQuantity'; productId: string; quantity: number }
  | { type: 'remove'; productId: string }
  | { type: 'clear' };

export const EMPTY_CART: CartState = { lines: [] };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'add': {
      if (action.quantity <= 0) return state;
      const existing = state.lines.find((l) => l.productId === action.productId);
      return {
        lines: existing
          ? state.lines.map((l) =>
              l.productId === action.productId
                ? { ...l, quantity: l.quantity + action.quantity }
                : l,
            )
          : [...state.lines, { productId: action.productId, quantity: action.quantity }],
      };
    }
    case 'setQuantity':
      return {
        lines:
          action.quantity <= 0
            ? state.lines.filter((l) => l.productId !== action.productId)
            : state.lines.map((l) =>
                l.productId === action.productId ? { ...l, quantity: action.quantity } : l,
              ),
      };
    case 'remove':
      return { lines: state.lines.filter((l) => l.productId !== action.productId) };
    case 'clear':
      return EMPTY_CART;
  }
}

/** Derived, never stored: the header badge and the summary read the same number. */
export function itemCount(state: CartState): number {
  return state.lines.reduce((n, l) => n + l.quantity, 0);
}
