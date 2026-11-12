/**
 * src/components/status-message.js
 *
 * The error state: a status-specific title and message (400, 404, 429, 500, network; wording from
 * api/errors.js describeError) with one action: "Try again" or "Clear all filters". After a 429 the
 * retry button stays disabled and counts down the Retry-After seconds.
 */
import * as dom from '../utils/dom.js';
import { describeError } from '../api/errors.js';

/**
 * Count down on the button, then enable it.
 * @param {HTMLButtonElement} button
 * @param {number} seconds
 * @returns {() => void} stops the countdown
 */
function countdown(button, seconds) {
  let left = seconds;
  button.disabled = true;
  button.textContent = `Try again in ${left} s`;
  const timer = setInterval(() => {
    left -= 1;
    if (left > 0) {
      button.textContent = `Try again in ${left} s`;
      return;
    }
    clearInterval(timer);
    button.disabled = false;
    button.textContent = 'Try again';
  }, 1000);
  return () => clearInterval(timer);
}

/**
 * The contents of the error box: heading, message, status line and the action button.
 * @param {ReturnType<typeof describeError>} info
 * @param {{ onRetry: () => void, onReset: () => void, resetLabel: string, headingLevel: string }} options
 * @returns {{ nodes: HTMLElement[], button: HTMLButtonElement }}
 */
function buildBox(info, { onRetry, onReset, resetLabel, headingLevel }) {
  const button = dom.el('button', {
    className: 'btn btn--secondary',
    text: info.action === 'retry' ? 'Try again' : resetLabel,
    attrs: { type: 'button' },
  });
  button.addEventListener('click', info.action === 'retry' ? onRetry : onReset);
  const nodes = [
    dom.el(headingLevel, { className: 'catalog__error-title', text: info.title }),
    dom.el('p', { text: info.message }),
    dom.el('p', {
      className: 'catalog__error-code',
      text: info.status ? `Error ${info.status}` : 'No connection',
    }),
    button,
  ];
  return { nodes, button };
}

/**
 * @param {HTMLElement} root container (hidden until an error is shown)
 * @param {{ onRetry: () => void, onReset: () => void, resetLabel?: string, headingLevel?: string }} options
 *   headingLevel keeps the outline valid: h3 under the catalog's h2, h2 directly under a page h1
 * @returns {{ show: (error: unknown) => void, hide: () => void, unmount: () => void }}
 */
export function mount(root, options) {
  const settings = { resetLabel: 'Clear all filters', headingLevel: 'h3', ...options };
  let stopCountdown = () => {};

  /** Build the error box for one failure. */
  function show(error) {
    stopCountdown();
    const info = describeError(error);
    const { nodes, button } = buildBox(info, settings);
    dom.clear(root);
    root.append(...nodes);
    root.dataset.status = String(info.status);
    root.hidden = false;
    if (info.status === 429 && error.retryAfter)
      stopCountdown = countdown(button, error.retryAfter);
  }

  return {
    show,
    hide() {
      stopCountdown();
      root.hidden = true;
      dom.clear(root);
    },
    unmount: () => stopCountdown(),
  };
}
