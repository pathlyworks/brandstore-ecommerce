/**
 * src/components/quantity-stepper.js
 *
 * A quantity control: "−" button, number field, "+" button. The value is always clamped to
 * 1..min(stock, 10) by utils/cart-math.js validateQuantity, and the reason is shown next to it
 * ("The smallest quantity is 1.", "Only 3 in stock.", "The limit is 10 per item.").
 */
import * as dom from '../utils/dom.js';
import { MAX_PER_LINE, validateQuantity } from '../utils/cart-math.js';

/**
 * The three elements of the stepper.
 * @param {string} id input id
 * @param {string} label what is being counted
 * @param {number} value
 * @param {number} stock
 * @returns {{ input: HTMLInputElement, minus: HTMLButtonElement, plus: HTMLButtonElement }}
 */
function createParts(id, label, value, stock) {
  const button = (text, name) =>
    dom.el('button', {
      className: 'stepper__button',
      text,
      attrs: { type: 'button', 'aria-label': `${name} ${label}` },
    });
  return {
    input: dom.el('input', {
      className: 'stepper__input',
      attrs: {
        id,
        type: 'number',
        inputmode: 'numeric',
        min: 1,
        max: Math.max(1, Math.min(stock, 10)),
        value,
      },
    }),
    minus: button('−', 'Decrease'),
    plus: button('+', 'Increase'),
  };
}

/**
 * @param {{ id: string, label: string, value: number, stock: number,
 *   onChange?: (quantity: number) => void, onZero?: () => void }} options
 *   onZero: called instead of clamping when the shopper types 0 or less (the cart removes the line)
 * @returns {{ element: HTMLElement, value: () => number }}
 */
export function createStepper({ id, label, value, stock, onChange = () => {}, onZero }) {
  const { input, minus, plus } = createParts(id, label, value, stock);
  const hint = dom.el('span', {
    className: 'stepper__hint',
    attrs: { id: `${id}-hint`, 'aria-live': 'polite' },
  });
  input.setAttribute('aria-describedby', `${id}-hint`);

  /** Validate (0 / above stock / above the limit), show the reason, update the buttons, report. */
  function set(next, notify = true) {
    if (onZero && notify && Number(next) <= 0) return onZero();
    const check = validateQuantity(next, stock);
    const quantity = Math.max(1, check.quantity);
    input.value = String(quantity);
    hint.textContent = notify ? check.message : '';
    minus.disabled = quantity <= 1;
    plus.disabled = quantity >= Math.min(stock, MAX_PER_LINE);
    if (notify) onChange(quantity);
  }

  minus.addEventListener('click', () => set(Number(input.value) - 1));
  plus.addEventListener('click', () => set(Number(input.value) + 1));
  input.addEventListener('change', () => set(input.value));
  set(value, false);

  const controls = dom.el(
    'div',
    { className: 'stepper', attrs: { role: 'group', 'aria-label': label } },
    [minus, input, plus],
  );
  return {
    element: dom.el('div', { className: 'stepper-field' }, [controls, hint]),
    value: () => Number(input.value),
  };
}
