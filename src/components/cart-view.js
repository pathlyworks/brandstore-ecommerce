/**
 * src/components/cart-view.js
 *
 * cart.html: the cart lines, totals (subtotal, shipping rule, total), "Clear cart", the saved-for-later
 * list and the recently viewed strip. On load, prices and stock are re-checked against the API (through
 * the Axios module) so the page never charges a stale price. Re-renders on every store change, in this
 * tab or another one, and puts keyboard focus back where it was.
 */
import * as dom from '../utils/dom.js';
import { formatMoney } from '../utils/money.js';
import { fetchProduct } from '../api/product-api.js';
import { cartSummary, clearCart, priceChanges, syncLines, syncWithCatalog } from '../state/cart.js';
import { renderCartLines } from './cart-panel.js';
import { renderSavedItems } from './saved-list.js';
import { renderRecent } from './recent-strip.js';

/**
 * Write the totals panel from cartSummary (the same numbers the menu badge uses).
 * @param {HTMLElement} panel
 * @param {ReturnType<typeof cartSummary>} t
 */
function renderTotals(panel, t) {
  const { currency } = t;
  const money = (cents) => formatMoney(cents, currency);
  dom.qs('[data-total="items"]', panel).textContent = String(t.itemCount);
  dom.qs('[data-total="subtotal"]', panel).textContent = money(t.subtotal);
  dom.qs('[data-total="shipping"]', panel).textContent =
    t.itemCount && !t.shipping ? 'Free' : money(t.shipping);
  dom.qs('[data-total="total"]', panel).textContent = money(t.total);
  dom.qs('[data-total="hint"]', panel).textContent = t.freeShippingRemaining
    ? `Add ${money(t.freeShippingRemaining)} more for free shipping.`
    : t.itemCount
      ? 'Your order ships free.'
      : '';
}

/**
 * Re-render everything, keeping focus on the same control when it still exists.
 * @param {HTMLElement} root
 * @param {{ cart: object, saved: object, say: Function }} ctx
 */
function render(root, ctx) {
  const focusKey = document.activeElement?.dataset?.focusKey;
  const { lines } = ctx.cart.get();
  const { items } = ctx.saved.get();
  renderCartLines(dom.qs('#cart-lines', root), lines, ctx);
  renderSavedItems(dom.qs('#saved-items', root), items, ctx);
  renderTotals(dom.qs('#cart-totals', root), cartSummary(ctx.cart.get()));
  dom.qs('#cart-empty', root).hidden = lines.length > 0;
  dom.qs('#cart-clear', root).hidden = lines.length === 0;
  dom.qs('#saved-empty', root).hidden = items.length > 0;
  dom.qs('#saved-count', root).textContent = `(${items.length})`;
  const again = focusKey && root.querySelector(`[data-focus-key="${focusKey}"]`);
  if (again) again.focus();
  else if (focusKey) dom.qs('#cart-heading', root).focus();
}

/**
 * Re-check every stored product against the API and apply price and stock changes.
 * @param {object} api Axios instance (api/product-api.js)
 * @param {{ cart: object, saved: object, say: Function }} ctx
 */
async function refreshFromCatalog(api, { cart, saved, say }) {
  const ids = [...new Set([...cart.get().lines, ...saved.get().items].map((l) => l.productId))];
  const results = await Promise.allSettled(ids.map((id) => fetchProduct(api, id)));
  const products = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') products[ids[i]] = r.value;
    else if (r.reason?.status === 404) products[ids[i]] = null; // no longer sold
  });
  const changes = priceChanges(cart.get().lines, products);
  cart.apply(syncWithCatalog, products);
  const items = syncLines(saved.get().items, products);
  if (items !== saved.get().items) saved.set({ ...saved.get(), items });
  if (changes.length) {
    say(
      changes
        .map(
          (c) =>
            `${c.name} is now ${formatMoney(c.to, c.currency)} (was ${formatMoney(c.from, c.currency)}).`,
        )
        .join(' '),
    );
  }
}

/**
 * @param {HTMLElement} root the cart page's <main>
 * @param {{ api: object, cart: object, saved: object, recent: object }} deps (stores from state/stores.js)
 */
export function mount(root, { api, cart, saved, recent }) {
  const message = dom.qs('#cart-message', root);
  const ctx = { cart, saved, say: (text) => (message.textContent = text) };
  dom.qs('#cart-clear', root).addEventListener('click', () => {
    cart.apply(clearCart);
    ctx.say('Your cart is empty now.');
  });
  cart.subscribe(() => render(root, ctx));
  saved.subscribe(() => render(root, ctx));
  render(root, ctx);
  renderRecent(dom.qs('#recently-viewed', root), recent.get());
  refreshFromCatalog(api, ctx);
}
