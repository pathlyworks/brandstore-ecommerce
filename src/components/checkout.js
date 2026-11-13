/**
 * src/components/checkout.js
 *
 * "Place order" on cart.html (POST /orders with the Bearer token).
 * - Empty cart, or nothing in stock: the attempt is stopped here with the reason (state/cart.js
 *   checkoutItems) and no request is sent. The button stays focusable (aria-disabled, not disabled) so
 *   keyboard and screen-reader users can reach it and hear why.
 * - Signed out or expired: sign in first, then come back to the cart (sessionStorage flags, not the URL).
 * - 201: the cart is emptied and the order number is announced. Any failure keeps the cart and says why
 *   (400, 429, 5xx, network); a 401 sends the shopper to sign in again.
 */
import { checkoutItems, clearCart } from '../state/cart.js';
import { placeOrder } from '../api/orders.js';
import { NOTICES, sendToLogin } from './auth-session.js';

/**
 * The words for a failed order. The cart is always kept.
 * @param {any} error an ApiError (status 0 = network)
 * @returns {string}
 */
export function checkoutErrorText(error) {
  const status = Number(error?.status) || 0;
  const reason =
    status === 400
      ? `The store did not accept the order: ${String(error.message || 'invalid order').replace(/\.$/, '')}.`
      : status === 429
        ? `Too many requests. Wait ${error.retryAfter ? `${error.retryAfter} seconds` : 'a moment'}, then try again.`
        : status >= 500
          ? 'Something went wrong on our side. Please try again in a moment.'
          : 'We could not reach the store. Check your connection, then try again.';
  return `Your order was not placed. ${reason} Your cart is unchanged.`;
}

/**
 * Keep the button and its note in step with the cart.
 * @param {{ button: HTMLButtonElement, note: HTMLElement }} parts
 * @param {object} cart
 * @param {boolean} signedIn
 */
function update({ button, note }, cart, signedIn) {
  const plan = checkoutItems(cart);
  button.setAttribute('aria-disabled', String(!plan.ok));
  note.textContent = !plan.ok
    ? plan.reason === 'empty'
      ? 'Add a product to your cart to check out. Your cart is saved on this device, so nothing is lost meanwhile.'
      : 'Nothing in your cart is in stock.'
    : signedIn
      ? 'Out-of-stock items are left out of the order.'
      : 'You will be asked to sign in first. Your cart is saved on this device, so nothing is lost meanwhile.';
}

/**
 * @param {HTMLElement} panel the order summary (#cart-totals)
 * @param {{ cart: object, session: object, flags: object, location: Location,
 *   createHttp: (onUnauthorized: () => void) => object, say: (text: string) => void }} deps
 * @returns {{ placeOrder: () => Promise<void> }} the click handler, for tests
 */
export function mountCheckout(panel, { cart, session, flags, location, createHttp, say }) {
  const parts = {
    button: panel.querySelector('#checkout'),
    note: panel.querySelector('#checkout-note'),
  };
  const ctx = { session, flags, location };
  const refresh = () => update(parts, cart.get(), session.isSignedIn());
  cart.subscribe(refresh);
  refresh();

  async function submit() {
    if (parts.button.getAttribute('aria-busy') === 'true') return; // no double orders
    const plan = checkoutItems(cart.get());
    if (!plan.ok) return say(plan.message); // empty cart: nothing is sent
    if (!session.isSignedIn()) {
      return sendToLogin(
        ctx,
        session.isExpired() ? NOTICES.expired : NOTICES.checkout,
        'cart.html',
      );
    }
    const http = createHttp(() => sendToLogin(ctx, NOTICES.expired, 'cart.html'));
    parts.button.setAttribute('aria-busy', 'true');
    parts.button.textContent = 'Placing order…';
    try {
      const order = await placeOrder(http, plan.items);
      cart.apply(clearCart);
      say(
        `Thank you! Order ${order.number} is placed and is ${order.status}. You can follow it on your account page.`,
      );
    } catch (error) {
      if (error?.status !== 401) say(checkoutErrorText(error)); // 401: already on the way to sign-in
    } finally {
      parts.button.removeAttribute('aria-busy');
      parts.button.textContent = 'Place order';
      refresh();
    }
  }

  parts.button.addEventListener('click', submit);
  return { placeOrder: submit };
}
