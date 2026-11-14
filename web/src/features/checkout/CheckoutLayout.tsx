/**
 * /checkout: a nested layout route. It requires a session (RequireAuth sends the shopper to sign in and back
 * to this step), stops on an empty cart, holds the draft (CheckoutProvider), shows the progress indicator and
 * renders the current step in its <Outlet />. Each step is its own URL (/checkout/address, /payment, /review),
 * so Back and Forward move between steps and a refresh reopens the same step with the same input.
 */
import { Link, Outlet, useLocation } from 'react-router';
import { Steps, type StepItem } from '../../components';
import { EmptyState } from '../../components/StatusMessage';
import { RequireAuth } from '../account/RequireAuth';
import { useCart } from '../cart/CartContext';
import { selectChargeableLines } from '../cart/cart.selectors';
import { CheckoutProvider, useCheckout } from './CheckoutContext';
import {
  blockingStep,
  CHECKOUT_STEPS,
  isStepValid,
  STEP_LABELS,
  type CheckoutStep,
} from './checkout.model';
import { loadPlacedOrders } from './checkout.storage';

export function CheckoutLayout() {
  return (
    <RequireAuth>
      <CheckoutProvider>
        <CheckoutShell />
      </CheckoutProvider>
    </RequireAuth>
  );
}

function currentStep(pathname: string): CheckoutStep | null {
  const last = pathname.split('/').filter(Boolean).pop();
  return CHECKOUT_STEPS.find((s) => s === last) ?? null;
}

function CheckoutShell() {
  const { cart } = useCart();
  const { draft } = useCheckout();
  const { pathname } = useLocation();
  const step = currentStep(pathname);

  if (selectChargeableLines(cart).length === 0) {
    const last = loadPlacedOrders()[0];
    return (
      <section aria-labelledby="page-title" className="flex flex-col gap-md">
        <h1 id="page-title" className="text-h1 font-extrabold tracking-tight text-text">
          Checkout
        </h1>
        <EmptyState title="There is nothing to check out">
          <p className="text-text">
            {cart.lines.length > 0
              ? 'Everything in your cart is out of stock. '
              : 'Your cart is empty. '}
            <Link to="/products" className="font-semibold text-primary underline">
              Browse the products
            </Link>
            {last && (
              <>
                {' '}
                or see{' '}
                <Link
                  to={`/checkout/confirmation/${encodeURIComponent(last.number)}`}
                  className="font-semibold text-primary underline"
                >
                  order {last.number}
                </Link>
                , which you just placed
              </>
            )}
            .
          </p>
        </EmptyState>
      </section>
    );
  }

  const index = step ? CHECKOUT_STEPS.indexOf(step) : -1;
  const items: StepItem<CheckoutStep>[] = CHECKOUT_STEPS.map((id, i) => {
    const valid = isStepValid(draft, id);
    const reachable = blockingStep(draft, id) === null;
    const state =
      id === step
        ? 'current'
        : i < index
          ? valid
            ? 'complete'
            : 'error'
          : valid && draft.touched.includes(id) && id !== 'review'
            ? 'complete'
            : 'upcoming';
    return { id, label: STEP_LABELS[id], to: `/checkout/${id}`, state, locked: !reachable };
  });

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="text-h1 font-extrabold tracking-tight text-text">Checkout</h1>
      <Steps label="Checkout progress" steps={items} />
      <Outlet />
    </div>
  );
}
