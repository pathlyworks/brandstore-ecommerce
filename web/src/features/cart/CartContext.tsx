/**
 * CartProvider: the cart in Context with useReducer, because the header badge on every route reads it and
 * the product and cart routes write it (task_1_architecture.md §5). It loads from localStorage once, saves on
 * every change, and follows changes made in another tab (the `storage` event, listener removed on unmount).
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS } from '../../config';
import {
  cartReducer,
  cartTotals,
  EMPTY_CART,
  rehydrate,
  type CartAction,
  type CartState,
} from './cart.reducer';

interface CartContextValue {
  cart: CartState;
  itemCount: number;
  subtotal: number;
  currency: string;
  dispatch: Dispatch<CartAction>;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStored(): CartState {
  try {
    const text = window.localStorage.getItem(STORAGE_KEYS.cart);
    return text ? rehydrate(JSON.parse(text)) : EMPTY_CART;
  } catch {
    return EMPTY_CART; // blocked or corrupted storage: start empty, keep working in memory
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, dispatch] = useReducer(cartReducer, undefined, readStored);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
    } catch {
      // full or blocked storage: the cart still works for this visit
    }
  }, [cart]);

  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEYS.cart) dispatch({ type: 'replace', state: readStored() });
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ cart, ...cartTotals(cart), dispatch }), [cart]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside <CartProvider>');
  return value;
}
