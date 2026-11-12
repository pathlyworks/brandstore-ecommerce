/**
 * src/components/saved-list.js
 *
 * The "Saved for later" list on cart.html: "Move to cart" (refused with the reason when the item is
 * out of stock or already at the limit) and "Remove". Persisted separately from the cart.
 */
import * as dom from '../utils/dom.js';
import { formatMoney } from '../utils/money.js';
import { moveToCart, removeSaved } from '../state/saved.js';
import { canAdd } from '../state/cart.js';
import { textButton } from './cart-panel.js';

/**
 * Turn a saved line into the product shape canAdd expects.
 * @param {object} item
 * @returns {{ id: string, stock: number }}
 */
function asProduct({ productId, stock }) {
  return { id: productId, stock };
}

/**
 * Name, price and (when it cannot move to the cart) the reason.
 * @param {object} item
 * @param {{ ok: boolean, reason: string }} check
 * @returns {HTMLElement}
 */
function savedInfo(item, check) {
  const id = item.productId;
  return dom.el('div', { className: 'cart-line__info' }, [
    dom.el('a', {
      className: 'cart-line__name',
      text: item.name,
      attrs: { href: `product.html?id=${encodeURIComponent(id)}` },
    }),
    dom.el('p', { className: 'cart-line__unit', text: formatMoney(item.unitPrice, item.currency) }),
    check.ok
      ? ''
      : dom.el('p', {
          className: 'cart-line__warning',
          text: check.reason,
          attrs: { id: `saved-reason-${id}` },
        }),
  ]);
}

/**
 * One saved item.
 * @param {object} item
 * @param {{ cart: object, saved: object, say: (text: string) => void }} ctx
 * @returns {HTMLLIElement}
 */
function savedItem(item, { cart, saved, say }) {
  const id = item.productId;
  const check = canAdd(cart.get(), asProduct(item));
  const move = textButton('Move to cart', `move-${id}`, `Move ${item.name} to the cart`);
  const remove = textButton('Remove', `unsave-${id}`, `Remove ${item.name} from saved items`);
  if (!check.ok) {
    move.disabled = true;
    move.setAttribute('aria-describedby', `saved-reason-${id}`);
  }
  move.addEventListener('click', () => {
    const next = moveToCart({ cart: cart.get(), saved: saved.get() }, id);
    if (next.reason) return say(next.reason);
    cart.apply(() => next.cart);
    saved.set(next.saved);
    say(`${item.name} moved to the cart.`);
  });
  remove.addEventListener('click', () => saved.set(removeSaved(saved.get(), id)));
  return dom.el('li', { className: 'saved-item', dataset: { id } }, [
    dom.el('img', {
      className: 'cart-line__image',
      attrs: { src: item.image.url, alt: '', width: 120, height: 90 },
    }),
    savedInfo(item, check),
    dom.el('div', { className: 'cart-line__actions' }, [move, remove]),
  ]);
}

/**
 * Render the saved list.
 * @param {HTMLUListElement} list
 * @param {object[]} items
 * @param {{ cart: object, saved: object, say: (text: string) => void }} ctx
 */
export function renderSavedItems(list, items, ctx) {
  dom.clear(list);
  items.forEach((item) => list.appendChild(savedItem(item, ctx)));
}
