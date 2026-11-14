/**
 * CartProvider: the cart in Context with useReducer, because the header badge on every route reads it and the
 * product, cart and checkout routes write it (task_1_architecture.md §5). Components change it only through
 * dispatch; the reducer is the one writer.
 */
import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import {
  cartReducer,
  EMPTY_CART,
  itemCount,
  type CartAction,
  type CartState,
} from './cart.reducer';

interface CartContextValue {
  cart: CartState;
  itemCount: number;
  dispatch: Dispatch<CartAction>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, EMPTY_CART);
  const value = useMemo(() => ({ cart, itemCount: itemCount(cart), dispatch }), [cart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside <CartProvider>');
  return value;
}
