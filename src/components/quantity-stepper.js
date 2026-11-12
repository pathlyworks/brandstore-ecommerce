/**
 * src/components/quantity-stepper.js
 *
 * A quantity control: "−" button, number field, "+" button. The value is always clamped to
 * 1..min(stock, 10) by utils/cart-math.js clampQuantity, so it can never ask for more than exists.
 */
import * as dom from '../utils/dom.js';
import { clampQuantity } from '../utils/cart-math.js';

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
 *   onChange?: (quantity: number) => void }} options
 * @returns {{ element: HTMLElement, value: () => number, setStock: (stock: number) => void }}
 */
export function createStepper({ id, label, value, stock, onChange = () => {} }) {
  let max = stock;
  const { input, minus, plus } = createParts(id, label, value, stock);

  /** Clamp, show, update the buttons, and report. */
  function set(next, notify = true) {
    const quantity = clampQuantity(next, max);
    input.value = String(quantity);
    minus.disabled = quantity <= 1;
    plus.disabled = quantity >= Math.min(max, 10);
    if (notify) onChange(quantity);
  }

  minus.addEventListener('click', () => set(Number(input.value) - 1));
  plus.addEventListener('click', () => set(Number(input.value) + 1));
  input.addEventListener('change', () => set(input.value));
  set(value, false);

  const element = dom.el(
    'div',
    { className: 'stepper', attrs: { role: 'group', 'aria-label': label } },
    [minus, input, plus],
  );
  return {
    element,
    value: () => Number(input.value),
    setStock(stockNow) {
      max = stockNow;
      input.max = String(Math.max(1, Math.min(stockNow, 10)));
      set(input.value, false);
    },
  };
}
