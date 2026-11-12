/**
 * src/components/cart-badge.js
 *
 * Keeps the "Cart (n)" link in the main navigation up to date, on every page and across tabs.
 */
import * as dom from '../utils/dom.js';

/**
 * Uses cartSummary (via the store), the same function the cart page's "Items" row uses.
 * @param {{ summary: () => { itemCount: number }, subscribe: Function }} cart store from state/stores.js
 */
export function mountCartBadge(cart) {
  const link = dom.qs('[data-cart-link]');
  if (!link) return;
  /** Write the count into the link text and its accessible name. */
  function update() {
    const count = cart.summary().itemCount;
    link.textContent = `Cart (${count})`;
    link.setAttribute('aria-label', `Cart, ${count} ${count === 1 ? 'item' : 'items'}`);
  }
  update();
  cart.subscribe(update);
}
