/**
 * src/components/cart-badge.js
 *
 * Keeps the "Cart (n)" link in the main navigation up to date, on every page and across tabs.
 */
import * as dom from '../utils/dom.js';

/**
 * @param {{ totals: () => { itemCount: number }, subscribe: Function }} cart store from state/cart.js
 */
export function mountCartBadge(cart) {
  const link = dom.qs('[data-cart-link]');
  if (!link) return;
  /** Write the count into the link text and its accessible name. */
  function update() {
    const count = cart.totals().itemCount;
    link.textContent = `Cart (${count})`;
    link.setAttribute('aria-label', `Cart, ${count} ${count === 1 ? 'item' : 'items'}`);
  }
  update();
  cart.subscribe(update);
}
