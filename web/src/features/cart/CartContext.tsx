/**
 * CartProvider: the cart in Context, written only through `dispatch` (the reducer is the single writer).
 *
 * - Loads once from localStorage (versioned, migrated and repaired: cart.storage.ts) as the reducer's
 *   initial state, so the first render already shows the stored cart.
 * - Saves every new state. The reducer returns the same object when nothing changed, so nothing is saved
 *   then. A cart stored by a newer version is not overwritten until the shopper changes it.
 * - Follows other tabs (the `storage` event) and re-prices the lines once on load (GET /products/:id for
 *   each line, aborted on unmount), so a stale price or stock in storage is corrected before checkout.
 * - Totals are selectors over the state (cart.selectors.ts), memoised with it.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { CartTotals, Product } from '@shared/domain';
import { fetchProduct } from '../../api/endpoints';
import { isAbort } from '../../api/client';
import { cartReducer, type CartAction, type CartState } from './cart.reducer';
import { selectItemCount, selectTotals } from './cart.selectors';
import {
  browserStorage,
  CART_STORAGE_KEY,
  loadCart,
  parseStoredCart,
  saveCart,
} from './cart.storage';

export interface CartContextValue {
  cart: CartState;
  totals: CartTotals;
  /** Every unit in the cart, for the header badge. */
  itemCount: number;
  dispatch: Dispatch<CartAction>;
  /** What re-pricing changed, for a polite announcement ("" when nothing). */
  notice: string;
}

const CartContext = createContext<CartContextValue | null>(null);

function describeReprice(before: CartState, after: CartState): string {
  const notes: string[] = [];
  for (const old of before.lines) {
    const now = after.lines.find((l) => l.productId === old.productId);
    if (!now) notes.push(`${old.name} is no longer sold and was removed.`);
    else if (now.stock === 0 && old.stock > 0)
      notes.push(`${now.name} is out of stock and will not be charged.`);
    else if (now.unitPrice !== old.unitPrice) notes.push(`The price of ${now.name} changed.`);
    else if (now.quantity < old.quantity)
      notes.push(`Only ${now.quantity} of ${now.name} are available.`);
  }
  return notes.join(' ');
}

export function CartProvider({
  children,
  revalidate = true,
}: {
  children: ReactNode;
  revalidate?: boolean;
}) {
  const [initial] = useState(() => loadCart(browserStorage('localStorage')));
  const [cart, dispatch] = useReducer(cartReducer, initial.state);
  const [notice, setNotice] = useState('');
  const loadedState = useRef(cart);

  // Save every new state (not the loaded one, so a newer version's cart is left alone until changed).
  useEffect(() => {
    if (cart === loadedState.current) return;
    saveCart(browserStorage('localStorage'), cart);
  }, [cart]);

  // Another tab saved the cart: take its state (validated like any stored data).
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== CART_STORAGE_KEY) return;
      const next = parseStoredCart(event.newValue).state;
      loadedState.current = next;
      dispatch({ type: 'hydrate', state: next });
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Re-price the stored lines once, on load.
  const firstLines = useRef(initial.state);
  useEffect(() => {
    const stored = firstLines.current;
    if (!revalidate || stored.lines.length === 0) return undefined;
    const controller = new AbortController();
    void Promise.allSettled(
      stored.lines.map((l) => fetchProduct(l.productId, controller.signal)),
    ).then((results) => {
      if (controller.signal.aborted) return;
      const products: Product[] = [];
      const missing: string[] = [];
      results.forEach((result, i) => {
        const id = stored.lines[i]?.productId;
        if (!id) return;
        if (result.status === 'fulfilled') products.push(result.value);
        else if (!isAbort(result.reason) && (result.reason as { status?: number }).status === 404)
          missing.push(id);
        // Other failures (network, 5xx): keep the stored snapshot; checkout re-checks nothing else.
      });
      const after = cartReducer(stored, { type: 'reprice', products, missing });
      setNotice(describeReprice(stored, after));
      dispatch({ type: 'reprice', products, missing });
    });
    return () => controller.abort();
  }, [revalidate]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      totals: selectTotals(cart),
      itemCount: selectItemCount(cart),
      dispatch,
      notice,
    }),
    [cart, notice],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error('useCart must be used inside <CartProvider>');
  return value;
}
