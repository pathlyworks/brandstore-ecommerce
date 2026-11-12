/**
 * src/components/product-detail.js
 *
 * The product page: loads GET /products/{id} through the Axios module (api/product-api.js) and shows
 * an image gallery, price, stock status, a quantity stepper, "Add to cart", "Save for later", a
 * specifications table and the "Recently viewed" strip. Out-of-stock products cannot be added and
 * say why. Errors are status-specific (404 "Product not found", 400, 429, 500, network).
 */
import * as dom from '../utils/dom.js';
import { formatMoney } from '../utils/money.js';
import { categoryLabel, ratingText } from '../utils/format.js';
import { fetchProduct } from '../api/product-api.js';
import { addToCart, canAdd, toLine } from '../state/cart.js';
import { saveItem } from '../state/saved.js';
import { recordView } from '../state/recent.js';
import { createGallery } from './gallery.js';
import { createStepper } from './quantity-stepper.js';
import { renderRecent } from './recent-strip.js';
import * as statusMessage from './status-message.js';

/**
 * Stock wording and whether the product can be bought.
 * @param {number} stock
 * @returns {{ text: string, available: boolean, note: string }}
 */
export function stockStatus(stock) {
  if (stock <= 0) {
    return {
      text: 'Out of stock',
      available: false,
      note: 'This item is out of stock, so it cannot be added to the cart. Save it for later and check back soon.',
    };
  }
  return {
    text: stock <= 5 ? `Only ${stock} left in stock` : 'In stock',
    available: true,
    note: '',
  };
}

/**
 * The specifications as a two-column table (row headers).
 * @param {{ label: string, value: string }[]} specs
 * @returns {HTMLTableElement}
 */
function createSpecs(specs) {
  const rows = specs.map(({ label, value }) =>
    dom.el('tr', {}, [
      dom.el('th', { text: label, attrs: { scope: 'row' } }),
      dom.el('td', { text: value }),
    ]),
  );
  return dom.el('table', { className: 'specs' }, [
    dom.el('caption', { className: 'specs__caption', text: 'Specifications' }),
    dom.el('tbody', {}, rows),
  ]);
}

/**
 * Say what happened, optionally with a "View cart" link.
 * @param {HTMLElement} message live region
 * @param {string} text
 * @param {boolean} [withCartLink]
 */
function say(message, text, withCartLink = false) {
  dom.clear(message);
  message.append(text);
  if (withCartLink)
    message.append(' ', dom.el('a', { text: 'View cart', attrs: { href: 'cart.html' } }));
}

/**
 * The purchase controls for one product (not yet wired).
 * @param {object} product
 * @returns {object} parts
 */
function createPurchaseParts(product) {
  const stock = stockStatus(product.stock);
  const parts = {
    stock,
    message: dom.el('p', { className: 'purchase__message', attrs: { role: 'status' } }),
    stepper: createStepper({ id: 'quantity', label: 'quantity', value: 1, stock: product.stock }),
    add: dom.el('button', {
      className: 'btn btn--secondary',
      text: 'Add to cart',
      attrs: { type: 'button' },
    }),
    save: dom.el('button', {
      className: 'btn btn--ghost',
      text: 'Save for later',
      attrs: { type: 'button' },
    }),
    note: dom.el('p', {
      className: 'purchase__note',
      text: stock.note,
      attrs: { id: 'stock-note' },
    }),
  };
  if (!stock.available) {
    parts.add.disabled = true;
    parts.add.setAttribute('aria-describedby', 'stock-note');
    parts.stepper.element.hidden = true;
  }
  return parts;
}

/**
 * "Add to cart" (refused with the reason when canAdd says no) and "Save for later".
 * @param {object} parts
 * @param {object} product
 * @param {{ cart: object, saved: object }} stores
 */
function bindPurchase({ add, save, message, stepper }, product, { cart, saved }) {
  add.addEventListener('click', () => {
    const check = canAdd(cart.get(), product);
    if (!check.ok) return say(message, check.reason);
    cart.apply(addToCart, product, stepper.value());
    say(message, `Added ${stepper.value()} × ${product.name} to your cart.`, true);
  });
  save.addEventListener('click', () => {
    saved.set(saveItem(saved.get(), toLine(product, stepper.value())));
    say(message, `${product.name} is saved for later. You can find it on the cart page.`);
  });
}

/**
 * Stock status, quantity, actions and the message line.
 * @param {object} product
 * @param {{ cart: object, saved: object }} stores
 * @returns {HTMLElement}
 */
function createPurchase(product, stores) {
  const parts = createPurchaseParts(product);
  bindPurchase(parts, product, stores);
  const { stock } = parts;
  const label = dom.el('label', {
    className: 'purchase__label',
    text: 'Quantity',
    attrs: { for: 'quantity' },
  });
  return dom.el('div', { className: 'purchase' }, [
    dom.el('p', {
      className: `purchase__stock${stock.available ? '' : ' purchase__stock--out'}`,
      text: stock.text,
    }),
    stock.available ? label : '',
    parts.stepper.element,
    dom.el('div', { className: 'purchase__actions' }, [parts.add, parts.save]),
    stock.note ? parts.note : '',
    parts.message,
  ]);
}

/**
 * Everything beside the gallery.
 * @param {object} product
 * @param {object} stores
 * @returns {HTMLElement}
 */
function createInfo(product, stores) {
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
    createPurchase(product, stores),
    dom.el('p', { className: 'product-detail__text', text: product.description }),
    createSpecs(product.specs),
  ]);
}

/**
 * @param {HTMLElement} root the product page's <main>
 * @param {{ api: object, id: string, cart: object, saved: object, storage: object }} deps
 * @returns {{ load: () => Promise<void> }}
 */
export function mount(root, { api, id, cart, saved, storage }) {
  const heading = dom.qs('#product-heading', root);
  const body = dom.qs('#product-body', root);
  const recent = dom.qs('#recently-viewed', root);
  const error = statusMessage.mount(dom.qs('#product-error', root), {
    onRetry: () => load(),
    onReset: () => window.location.assign('catalog.html'),
    resetLabel: 'Browse all products',
    headingLevel: 'h2',
  });

  /** Load and show the product (or the error), then update "Recently viewed". */
  async function load() {
    error.hide();
    body.setAttribute('aria-busy', 'true');
    body.textContent = 'Loading product…';
    try {
      const product = await fetchProduct(api, id);
      heading.textContent = product.name;
      document.title = `${product.name} — BrandStore`;
      dom.clear(body);
      body.append(createGallery(product.images), createInfo(product, { cart, saved }));
      renderRecent(recent, recordView(storage, product), { excludeId: product.id });
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
