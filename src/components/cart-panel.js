/**
 * src/components/cart-panel.js
 *
 * The cart lines on cart.html: image, name, unit price, quantity stepper, line total, "Save for later"
 * and "Remove". An out-of-stock line stays visible, explains itself and is left out of the total.
 * Every change goes through the pure functions in state/cart.js and state/saved.js.
 */
import * as dom from '../utils/dom.js';
import { formatMoney } from '../utils/money.js';
import { lineTotal } from '../utils/cart-math.js';
import { removeFromCart, updateQuantity } from '../state/cart.js';
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
 * One cart line.
 * @param {object} line
 * @param {{ cart: object, saved: object }} stores
 * @returns {HTMLLIElement}
 */
function cartLine(line, { cart, saved }) {
  const id = line.productId;
  const stepper = createStepper({
    id: `qty-${id}`,
    label: `quantity of ${line.name}`,
    value: line.quantity,
    stock: line.stock,
    onChange: (quantity) => cart.apply(updateQuantity, id, quantity),
    onZero: () => cart.apply(updateQuantity, id, 0), // typing 0 removes the line (same rule as the reducer)
  });
  stepper.element
    .querySelectorAll('button, input')
    .forEach((el, i) => (el.dataset.focusKey = `qty-${id}-${i}`));
  const save = textButton('Save for later', `save-${id}`, `Save ${line.name} for later`);
  const remove = textButton('Remove', `remove-${id}`, `Remove ${line.name} from the cart`);
  save.addEventListener('click', () => {
    const next = moveToSaved({ cart: cart.get(), saved: saved.get() }, id);
    saved.set(next.saved);
    cart.apply(() => next.cart);
  });
  remove.addEventListener('click', () => cart.apply(removeFromCart, id));
  return dom.el('li', { className: 'cart-line', dataset: { id } }, [
    dom.el('img', {
      className: 'cart-line__image',
      attrs: { src: line.image.url, alt: '', width: 120, height: 90 },
    }),
    lineInfo(line),
    line.stock > 0 ? stepper.element : '',
    dom.el('p', {
      className: 'cart-line__total',
      text: formatMoney(lineTotal(line), line.currency),
    }),
    dom.el('div', { className: 'cart-line__actions' }, [save, remove]),
  ]);
}

/**
 * Render every line into the list.
 * @param {HTMLUListElement} list
 * @param {object[]} lines
 * @param {{ cart: object, saved: object }} stores
 */
export function renderCartLines(list, lines, stores) {
  dom.clear(list);
  lines.forEach((line) => list.appendChild(cartLine(line, stores)));
}
