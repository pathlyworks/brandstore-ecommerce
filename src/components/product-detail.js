/**
 * src/components/product-detail.js
 *
 * The product page: reads ?id= from the URL, loads GET /products/{id}, and shows the product or a
 * status-specific error (404 "not found", 400 bad id, 429 wait, 500 retry).
 */
import * as dom from '../utils/dom.js';
import { formatMoney } from '../utils/money.js';
import { categoryLabel, ratingText, stockText } from '../utils/format.js';
import { getProduct } from '../api/products.js';
import * as statusMessage from './status-message.js';

/**
 * The specification list (label / value pairs).
 * @param {{ label: string, value: string }[]} specs
 * @returns {HTMLDListElement}
 */
function createSpecs(specs) {
  return dom.el(
    'dl',
    { className: 'product-detail__specs' },
    specs.flatMap((s) => [dom.el('dt', { text: s.label }), dom.el('dd', { text: s.value })]),
  );
}

/**
 * Everything to the right of the image.
 * @param {object} product GET /products/{id} data
 * @returns {HTMLElement}
 */
function createInfo(product) {
  const rating = ratingText(product.rating, product.reviewCount);
  return dom.el('div', { className: 'product-detail__info' }, [
    dom.el('p', { className: 'product-card__tag', text: categoryLabel(product.category) }),
    dom.el('p', { className: 'product-detail__brand', text: product.brand }),
    dom.el('p', {
      className: 'product-card__rating',
      text: rating.text,
      attrs: { 'aria-label': rating.label },
    }),
    dom.el('p', {
      className: 'product-detail__price',
      text: formatMoney(product.price, product.currency),
    }),
    dom.el('p', {
      className: 'product-detail__stock',
      text: stockText(product.stock) || 'In stock',
    }),
    dom.el('p', { className: 'product-detail__text', text: product.description }),
    createSpecs(product.specs),
  ]);
}

/**
 * Fill the page with one product.
 * @param {HTMLElement} body container
 * @param {HTMLElement} heading the page <h1>
 * @param {object} product
 */
function render(body, heading, product) {
  heading.textContent = product.name;
  document.title = `${product.name} — BrandStore`;
  dom.clear(body);
  body.append(
    dom.el('img', {
      className: 'product-detail__image',
      attrs: { src: product.image.url, alt: product.image.alt, width: 400, height: 300 },
    }),
    createInfo(product),
  );
}

/**
 * @param {HTMLElement} root the product page's <main>
 * @param {{ http: object, id: string }} deps
 * @returns {{ load: () => Promise<void> }}
 */
export function mount(root, { http, id }) {
  const heading = dom.qs('#product-heading', root);
  const body = dom.qs('#product-body', root);
  const error = statusMessage.mount(dom.qs('#product-error', root), {
    onRetry: () => load(),
    onReset: () => window.location.assign('catalog.html'),
    resetLabel: 'Browse all products',
    headingLevel: 'h2',
  });

  /** Load and show the product (or the error). */
  async function load() {
    error.hide();
    body.setAttribute('aria-busy', 'true');
    body.textContent = 'Loading product…';
    try {
      render(body, heading, await getProduct(http, id));
    } catch (failure) {
      body.textContent = '';
      heading.textContent = failure.status === 404 ? 'Product not found' : 'Product';
      error.show(failure);
    }
    body.setAttribute('aria-busy', 'false');
  }

  load();
  return { load };
}
