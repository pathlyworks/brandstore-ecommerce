/**
 * The checkout draft in Context for the /checkout routes, written only through the pure checkoutReducer and
 * saved to sessionStorage after every change, so each step's input survives a refresh, Back and Forward,
 * and the sign-in detour (checkout.storage.ts).
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
import {
  checkoutReducer,
  newIdempotencyKey,
  type CheckoutAction,
  type CheckoutDraft,
} from './checkout.model';
import { loadDraft, saveDraft } from './checkout.storage';

interface CheckoutContextValue {
  draft: CheckoutDraft;
  dispatch: Dispatch<CheckoutAction>;
}

const CheckoutContext = createContext<CheckoutContextValue | null>(null);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [draft, dispatch] = useReducer(checkoutReducer, undefined, () =>
    loadDraft(newIdempotencyKey),
  );

  useEffect(() => {
    saveDraft(draft);
  }, [draft]);

  const value = useMemo(() => ({ draft, dispatch }), [draft]);
  return <CheckoutContext.Provider value={value}>{children}</CheckoutContext.Provider>;
}

export function useCheckout(): CheckoutContextValue {
  const value = useContext(CheckoutContext);
  if (!value) throw new Error('useCheckout must be used inside <CheckoutProvider>');
  return value;
}
