/**
 * src/components/product-card.js
 *
 * One catalog card built from a GET /products item with document.createElement and textContent
 * (never innerHTML), so text from the API is never parsed as markup.
 */
import * as dom from '../utils/dom.js';
import { formatMoney } from '../utils/money.js';
import { categoryLabel, ratingText, stockText } from '../utils/format.js';

/**
 * The price line: current price, and the old price when the item is reduced.
 * @param {{ price: number, compareAtPrice: number | null, currency: string }} product
 * @returns {HTMLElement}
 */
function createPrice(product) {
  const parts = [dom.el('span', { text: formatMoney(product.price, product.currency) })];
  if (product.compareAtPrice && product.compareAtPrice > product.price) {
    parts.push(' ');
    parts.push(
      dom.el('s', {
        className: 'product-card__was',
        text: formatMoney(product.compareAtPrice, product.currency),
        attrs: { 'aria-label': `was ${formatMoney(product.compareAtPrice, product.currency)}` },
      }),
    );
  }
  return dom.el('p', { className: 'product-card__price' }, parts);
}

/**
 * Card body: category, linked name, brand, rating, stock and price.
 * @param {object} product
 * @returns {HTMLElement}
 */
function createBody(product) {
  const rating = ratingText(product.rating, product.reviewCount);
  const stock = stockText(product.stock);
  const link = dom.el('a', {
    className: 'product-card__link',
    text: product.name,
    attrs: { href: `product.html?id=${encodeURIComponent(product.id)}` },
  });
  return dom.el('div', { className: 'product-card__body' }, [
    dom.el('span', { className: 'product-card__tag', text: categoryLabel(product.category) }),
    dom.el('h3', { className: 'product-card__title' }, [link]),
    dom.el('p', { className: 'product-card__brand', text: product.brand }),
    dom.el('p', {
      className: 'product-card__rating',
      text: rating.text,
      attrs: { 'aria-label': rating.label },
    }),
    stock ? dom.el('p', { className: 'product-card__stock', text: stock }) : '',
    createPrice(product),
  ]);
}

/**
 * @param {object} product an item from GET /products
 * @returns {HTMLLIElement}
 */
export function createProductCard(product) {
  const image = dom.el('img', {
    className: 'product-card__image',
    attrs: {
      src: product.image.url,
      alt: product.image.alt,
      width: 400,
      height: 300,
      loading: 'lazy',
      decoding: 'async',
    },
  });
  const article = dom.el('article', { className: 'product-card', dataset: { id: product.id } }, [
    dom.el('div', { className: 'product-card__media' }, [image]),
    createBody(product),
  ]);
  return dom.el('li', { className: 'catalog__item' }, [article]);
}
