/**
 * src/components/recent-strip.js
 *
 * "Recently viewed" strip from state/recent.js (sessionStorage): small linked cards, newest first.
 * The section stays hidden when there is nothing to show.
 */
import * as dom from '../utils/dom.js';
import { formatMoney } from '../utils/money.js';

/**
 * One small card.
 * @param {{ id: string, name: string, price: number, currency: string, image: object }} item
 * @returns {HTMLLIElement}
 */
function recentCard({ id, name, price, currency, image }) {
  return dom.el('li', { className: 'recent__item' }, [
    dom.el(
      'a',
      {
        className: 'recent__link',
        attrs: { href: `product.html?id=${encodeURIComponent(id)}` },
        dataset: { id },
      },
      [
        dom.el('img', {
          className: 'recent__image',
          attrs: { src: image.url, alt: '', width: 120, height: 90, loading: 'lazy' },
        }),
        dom.el('span', { className: 'recent__name', text: name }),
        dom.el('span', { className: 'recent__price', text: formatMoney(price, currency) }),
      ],
    ),
  ]);
}

/**
 * Render (or hide) the strip.
 * @param {HTMLElement} section container with an <h2> and a <ul class="recent__list">
 * @param {object[]} list from readRecent / recordView
 * @param {{ excludeId?: string }} [options] leave out the product on screen
 */
export function renderRecent(section, list, { excludeId = '' } = {}) {
  const items = list.filter(({ id }) => id !== excludeId);
  const ul = dom.qs('.recent__list', section);
  dom.clear(ul);
  items.forEach((item) => ul.appendChild(recentCard(item)));
  section.hidden = items.length === 0;
}
