/**
 * src/components/product-list.js
 *
 * The results area of the catalog: a list of product cards, a loading state (placeholder cards,
 * aria-busy) and an empty state with a "Clear all filters" button. Errors are shown by
 * status-message.js in the same area.
 */
import * as dom from '../utils/dom.js';
import { createProductCard } from './product-card.js';

/**
 * Placeholder cards shown while a page loads, so the layout does not jump.
 * @param {number} count
 * @returns {HTMLLIElement[]}
 */
function placeholders(count) {
  return Array.from({ length: count }, () =>
    dom.el('li', { className: 'catalog__item', attrs: { 'aria-hidden': 'true' } }, [
      dom.el('div', { className: 'product-card product-card--placeholder' }),
    ]),
  );
}

/**
 * @param {HTMLElement} root the results <ul>
 * @param {{ onReset: () => void }} deps
 * @returns {{ showLoading: (count: number) => void, showProducts: (items: object[]) => void,
 *   showEmpty: () => void, clear: () => void, unmount: () => void }}
 */
export function mount(root, { onReset }) {
  const empty = dom.el('div', { className: 'catalog__empty', attrs: { hidden: '' } }, [
    dom.el('h3', { className: 'catalog__empty-title', text: 'No products match your filters' }),
    dom.el('p', { text: 'Try a different search, widen the price range, or clear the filters.' }),
  ]);
  const resetButton = dom.el('button', {
    className: 'btn btn--ghost',
    text: 'Clear all filters',
    attrs: { type: 'button' },
  });
  resetButton.addEventListener('click', onReset);
  empty.appendChild(resetButton);
  root.after(empty);

  /** Replace the list contents and the busy flag. */
  function render(items, busy) {
    dom.clear(root);
    items.forEach((item) => root.appendChild(item));
    root.setAttribute('aria-busy', String(busy));
    empty.hidden = true;
  }

  return {
    showLoading: (count) => render(placeholders(count), true),
    showProducts: (products) => render(products.map(createProductCard), false),
    showEmpty() {
      render([], false);
      empty.hidden = false;
    },
    clear: () => render([], false),
    unmount() {
      resetButton.removeEventListener('click', onReset);
      empty.remove();
    },
  };
}
