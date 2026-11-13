/**
 * src/components/cart-panel.js
 *
 * The cart lines on cart.html: image, name, unit price, quantity stepper, line total, "Save for later"
 * and "Remove". An out-of-stock line stays visible, explains itself and is left out of the total.
 * Every change goes through the pure functions in state/cart.js and state/saved.js, and is announced in
 * the page's live region (role="status") with the new cart total, so screen-reader users hear the result.
 */
import * as dom from '../utils/dom.js';
import { formatMoney } from '../utils/money.js';
import { lineTotal } from '../utils/cart-math.js';
import { cartSummary, removeFromCart, updateQuantity } from '../state/cart.js';
import { moveToSaved } from '../state/saved.js';
import { createStepper } from './quantity-stepper.js';

/**
 * A small text button with a focus key (so focus can be restored after re-rendering).
 * @param {string} text
 * @param {string} focusKey
 * @param {string} label accessible name
 * @returns {HTMLButtonElement}
 */
export function textButton(text, focusKey, label) {
  return dom.el('button', {
    className: 'link-button',
    text,
    attrs: { type: 'button', 'aria-label': label },
    dataset: { focusKey },
  });
}

/**
 * Name, unit price and (for unavailable lines) the explanation.
 * @param {object} line
 * @returns {HTMLElement}
 */
function lineInfo(line) {
  const href = `product.html?id=${encodeURIComponent(line.productId)}`;
  return dom.el('div', { className: 'cart-line__info' }, [
    dom.el('a', { className: 'cart-line__name', text: line.name, attrs: { href } }),
    dom.el('p', {
      className: 'cart-line__unit',
      text: `${formatMoney(line.unitPrice, line.currency)} each`,
    }),
    line.stock > 0
      ? ''
      : dom.el('p', {
          className: 'cart-line__warning',
          text: 'Out of stock: not included in the total. Save it for later or remove it.',
        }),
  ]);
}

/**
 * What a cart change sounds like: "Quantity of Mug is now 3. Cart total: $96.00."
 * @param {string} text what happened
 * @param {object} cart the cart state after the change
 * @returns {string}
 */
export function cartUpdateMessage(text, cart) {
  const { total, itemCount, currency } = cartSummary(cart);
  const items = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
  return itemCount
    ? `${text} Cart total: ${formatMoney(total, currency)} for ${items}.`
    : `${text} Your cart is empty.`;
}

/**
 * The quantity stepper for a line; every change is announced with the new total.
 * @param {object} line
 * @param {object} cart the cart store
 * @param {(text: string) => void} announce
 * @returns {{ element: HTMLElement }}
 */
function lineStepper(line, cart, announce) {
  const id = line.productId;
  const setQuantity = (quantity) => {
    cart.apply(updateQuantity, id, quantity);
    const now = cart.get().lines.find((l) => l.productId === id); // after the reducer's own limits
    announce(
      now
        ? `Quantity of ${line.name} is now ${now.quantity}.`
        : `${line.name} removed from the cart.`,
    );
  };
  const stepper = createStepper({
    id: `qty-${id}`,
    label: `quantity of ${line.name}`,
    value: line.quantity,
    stock: line.stock,
    onChange: (quantity) => setQuantity(quantity),
    onZero: () => setQuantity(0), // typing 0 removes the line (same rule as the reducer)
  });
  stepper.element
    .querySelectorAll('button, input')
    .forEach((el, i) => (el.dataset.focusKey = `qty-${id}-${i}`));
  return stepper;
}

/**
 * "Save for later" and "Remove" for a line, each announced.
 * @param {object} line
 * @param {{ cart: object, saved: object }} stores
 * @param {(text: string) => void} announce
 * @returns {HTMLButtonElement[]}
 */
function lineActions(line, { cart, saved }, announce) {
  const id = line.productId;
  const save = textButton('Save for later', `save-${id}`, `Save ${line.name} for later`);
  const remove = textButton('Remove', `remove-${id}`, `Remove ${line.name} from the cart`);
  save.addEventListener('click', () => {
    const next = moveToSaved({ cart: cart.get(), saved: saved.get() }, id);
    saved.set(next.saved);
    cart.apply(() => next.cart);
    announce(`${line.name} saved for later.`);
  });
  remove.addEventListener('click', () => {
    cart.apply(removeFromCart, id);
    announce(`${line.name} removed from the cart.`);
  });
  return [save, remove];
}

/**
 * One cart line.
 * @param {object} line
 * @param {{ cart: object, saved: object, say?: (text: string) => void }} stores
 * @returns {HTMLLIElement}
 */
function cartLine(line, stores) {
  const { cart, say = () => {} } = stores;
  const announce = (text) => say(cartUpdateMessage(text, cart.get()));
  return dom.el('li', { className: 'cart-line', dataset: { id: line.productId } }, [
    dom.el('img', {
      className: 'cart-line__image',
      attrs: { src: line.image.url, alt: '', width: 120, height: 90 },
    }),
    lineInfo(line),
    line.stock > 0 ? lineStepper(line, cart, announce).element : '',
    dom.el('p', {
      className: 'cart-line__total',
      text: formatMoney(lineTotal(line), line.currency),
    }),
    dom.el('div', { className: 'cart-line__actions' }, lineActions(line, stores, announce)),
  ]);
}

/**
 * Render every line into the list.
 * @param {HTMLUListElement} list
 * @param {object[]} lines
 * @param {{ cart: object, saved: object, say?: (text: string) => void }} stores
 */
export function renderCartLines(list, lines, stores) {
  dom.clear(list);
  lines.forEach((line) => list.appendChild(cartLine(line, stores)));
}
