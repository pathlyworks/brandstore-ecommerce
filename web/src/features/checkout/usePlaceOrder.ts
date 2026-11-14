/**
 * Placing the order, at most once.
 *
 * Double submission is stopped at three levels:
 * 1. In this page: `inFlight` is a ref, set synchronously before the request starts, so a double click or a
 *    click plus Enter in the same frame (before React re-renders the button as busy) is ignored. The button
 *    then shows "Placing your order…" with aria-disabled, and ignores clicks, until the request ends.
 * 2. In this tab: the placed order is remembered with the draft's idempotency key (sessionStorage). Coming
 *    back to the review step with the same draft (Back, refresh, a second tab of the same session) finds it
 *    and opens its confirmation instead of posting again. After success the draft and the cart are cleared,
 *    so there is nothing left to submit.
 * 3. On the server: the key is sent with the order (`idempotencyKey`). After a failure whose outcome is
 *    unknown (network error, 5xx) "Try again" sends the SAME key, so a backend that honours it creates one
 *    order. The TechSphere mock ignores the key (it would accept a true duplicate); see task_3_checkout.md.
 */
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import type { AppError } from '@shared/domain';
import { placeOrder, type CheckoutOrderRequest } from '../../api/endpoints';
import { toAppError } from '../../hooks/useApi';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/CartContext';
import { selectOrderItems } from '../cart/cart.selectors';
import { useCheckout } from './CheckoutContext';
import { describePayment, normalisePhone } from './checkout.model';
import { clearDraft, loadPlacedOrders, rememberPlacedOrder } from './checkout.storage';

export type PlacePhase =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'error'; error: AppError };

export const confirmationPath = (number: string) =>
  `/checkout/confirmation/${encodeURIComponent(number)}`;

export function usePlaceOrder() {
  const { draft } = useCheckout();
  const { cart, totals, dispatch: cartDispatch } = useCart();
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const inFlight = useRef(false);
  const [phase, setPhase] = useState<PlacePhase>({ status: 'idle' });

  async function place(): Promise<void> {
    if (inFlight.current) return;
    const already = loadPlacedOrders().find((o) => o.idempotencyKey === draft.idempotencyKey);
    if (already) {
      void navigate(confirmationPath(already.number), { replace: true });
      return;
    }
    const items = selectOrderItems(cart);
    const [first, ...rest] = items;
    if (!session || !first) return;
    const { address, payment } = draft;
    if (payment.method === '') return;

    inFlight.current = true;
    setPhase({ status: 'submitting' });
    const body: CheckoutOrderRequest = {
      items: [first, ...rest],
      idempotencyKey: draft.idempotencyKey,
      shipping: {
        fullName: address.fullName.trim(),
        phone: normalisePhone(address.phone),
        street: address.street.trim(),
        city: address.city.trim(),
        governorate: address.governorate,
        ...(address.postalCode.trim() ? { postalCode: address.postalCode.trim() } : {}),
      },
      payment: { method: payment.method, reference: describePayment(payment) },
    };
    try {
      const placed = await placeOrder(body, session.token);
      const number = placed.number || placed.id;
      rememberPlacedOrder({
        id: placed.id,
        number,
        status: placed.status,
        idempotencyKey: draft.idempotencyKey,
        placedAt: new Date().toISOString(),
        itemCount: totals.itemCount,
        total: totals.total,
        currency: totals.currency,
        deliverTo: `${body.shipping.street}, ${body.shipping.city}`,
        payment: describePayment(payment),
      });
      await navigate(confirmationPath(number), { replace: true });
      clearDraft();
      cartDispatch({ type: 'clear' });
    } catch (error) {
      inFlight.current = false;
      const appError = toAppError(error);
      setPhase({ status: 'error', error: appError });
      // Session over: sign out; RequireAuth sends the shopper to sign in and back here, draft intact.
      if (appError.status === 401) signOut();
    }
  }

  return { phase, place };
}
