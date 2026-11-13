/**
 * src/state/cart.js
 *
 * The cart as PURE functions over a state object `{ lines: CartLine[] }`: no DOM, no storage, no
 * network, no clock (ESLint forbids them in this file). Every update destructures its input and
 * returns a NEW state built with spread; the old state is never changed. `cartReducer` dispatches
 * named actions to the same functions. Persistence lives in state/stores.js.
 *
 * Quantity rules: at least 1, at most the stock, at most MAX_PER_LINE (10). Setting a line's quantity
 * to 0 (or less) removes the line. Out-of-stock products are refused with a reason.
 */
import { MAX_PER_LINE, totals, validateQuantity } from '../utils/cart-math.js';

/** @typedef {import('../utils/cart-math.js').CartLine} CartLine */
/** @typedef {{ lines: CartLine[] }} CartState */

/** @type {CartState} */
export const EMPTY_CART = Object.freeze({ lines: Object.freeze([]) });

/** Shown when a stored line has no usable image. */
export const PLACEHOLDER_IMAGE = Object.freeze({ url: '/assets/product-placeholder.svg', alt: '' });

/**
 * Turn an API product (GET /products or /products/{id}) into a cart line.
 * @param {object} product
 * @param {number} quantity
 * @returns {CartLine}
 */
export function toLine(
  { id, name, price, currency = 'USD', stock, image = PLACEHOLDER_IMAGE },
  quantity,
) {
  return { productId: id, name, unitPrice: price, currency, stock, quantity, image: { ...image } };
}

/**
 * Can `quantity` more of this product go into the cart? Explains why not.
 * @param {CartState} cart
 * @param {{ id: string, stock: number }} product
 * @param {number} [quantity]
 * @returns {{ ok: boolean, reason: string }}
 */
export function canAdd({ lines }, { id, stock }, quantity = 1) {
  if (stock <= 0)
    return { ok: false, reason: 'Out of stock: this item cannot be added to the cart right now.' };
  if (!(Number(quantity) >= 1)) return { ok: false, reason: 'Choose a quantity of at least 1.' };
  const inCart = lines.find((line) => line.productId === id)?.quantity || 0;
  const most = Math.min(stock, MAX_PER_LINE);
  if (inCart >= most) {
    return { ok: false, reason: `You already have the most we can sell of this item (${most}).` };
  }
  return { ok: true, reason: '' };
}

/**
 * Add a product (or more of it), never beyond min(stock, 10). Refused (same state back) when canAdd says no.
 * @param {CartState} cart
 * @param {object} product API product
 * @param {number} [quantity]
 * @returns {CartState}
 */
export function addToCart(cart, product, quantity = 1) {
  if (!canAdd(cart, product, quantity).ok) return cart;
  const { lines } = cart;
  const existing = lines.find(({ productId }) => productId === product.id);
  if (!existing) {
    const { quantity: allowed } = validateQuantity(quantity, product.stock);
    return { ...cart, lines: [...lines, toLine(product, allowed)] };
  }
  return updateQuantity(cart, product.id, existing.quantity + Math.floor(Number(quantity)));
}

/**
 * Set a line's quantity: 0 or less removes the line; above the stock or the limit is reduced to it.
 * @param {CartState} cart
 * @param {string} productId
 * @param {number} quantity
 * @returns {CartState}
 */
export function updateQuantity(cart, productId, quantity) {
  if (Number(quantity) <= 0) return removeFromCart(cart, productId);
  const { lines } = cart;
  return {
    ...cart,
    lines: lines.map((line) =>
      line.productId === productId
        ? { ...line, quantity: Math.max(1, validateQuantity(quantity, line.stock).quantity) }
        : line,
    ),
  };
}

/**
 * Remove a line.
 * @param {CartState} cart
 * @param {string} productId
 * @returns {CartState}
 */
export function removeFromCart(cart, productId) {
  const { lines } = cart;
  return { ...cart, lines: lines.filter((line) => line.productId !== productId) };
}

/**
 * Empty the cart.
 * @param {CartState} cart
 * @returns {CartState}
 */
export function clearCart(cart) {
  return { ...cart, lines: [] };
}

/**
 * Lines that can be bought now; out-of-stock lines stay visible but are not charged or counted.
 * @param {CartState} cart
 * @returns {CartLine[]}
 */
export function availableLines({ lines }) {
  return lines.filter(({ stock }) => stock > 0);
}

/** Why checkout cannot start, in the shopper's words. */
export const CHECKOUT_BLOCKED = Object.freeze({
  empty: 'Your cart is empty. Add a product before you check out.',
  unavailable:
    'Nothing in your cart is in stock right now, so there is nothing to order. Save the items for later or remove them.',
});

/**
 * What "Place order" sends (POST /orders { items: [{ productId, qty }] }), or why it cannot start. An empty
 * cart never reaches the API; out-of-stock lines are left out, as they are left out of the total.
 * @param {CartState} cart
 * @returns {{ ok: true, items: { productId: string, qty: number }[] } | { ok: false, reason: 'empty' | 'unavailable', message: string }}
 */
export function checkoutItems(cart) {
  if (!cart.lines.length) return { ok: false, reason: 'empty', message: CHECKOUT_BLOCKED.empty };
  const lines = availableLines(cart);
  if (!lines.length)
    return { ok: false, reason: 'unavailable', message: CHECKOUT_BLOCKED.unavailable };
  return { ok: true, items: lines.map((l) => ({ productId: l.productId, qty: l.quantity })) };
}

/**
 * The numbers the cart page AND the menu badge show (one function, so they always agree).
 * @param {CartState} cart
 * @returns {import('../utils/cart-math.js').CartTotals & { currency: string }}
 */
export function cartSummary(cart) {
  const lines = availableLines(cart);
  return { ...totals(lines), currency: lines[0]?.currency || 'USD' };
}

/**
 * Bring stored lines up to date with the catalog (price, stock, name). A product the API no longer
 * has (null in `products`) gets stock 0. Returns the same array when nothing changed.
 * @param {CartLine[]} lines
 * @param {Record<string, object | null>} products by id
 * @returns {CartLine[]}
 */
export function syncLines(lines, products) {
  let changed = false;
  const next = lines.map((line) => {
    if (!(line.productId in products)) return line;
    const { price = line.unitPrice, stock = 0, name = line.name } = products[line.productId] || {};
    if (price === line.unitPrice && stock === line.stock && name === line.name) return line;
    changed = true;
    const quantity = Math.min(line.quantity, Math.max(1, Math.min(stock, MAX_PER_LINE)));
    return { ...line, unitPrice: price, stock, name, quantity };
  });
  return changed ? next : lines;
}

/**
 * Price changes between stored lines and the catalog.
 * @param {CartLine[]} lines
 * @param {Record<string, object | null>} products
 * @returns {{ name: string, from: number, to: number, currency: string }[]}
 */
export function priceChanges(lines, products) {
  return lines
    .filter(
      ({ productId, unitPrice }) => products[productId] && products[productId].price !== unitPrice,
    )
    .map(({ productId, name, unitPrice, currency }) => ({
      name,
      from: unitPrice,
      to: products[productId].price,
      currency,
    }));
}

/**
 * Apply catalog data to the whole cart.
 * @param {CartState} cart
 * @param {Record<string, object | null>} products
 * @returns {CartState}
 */
export function syncWithCatalog(cart, products) {
  const lines = syncLines(cart.lines, products);
  return lines === cart.lines ? cart : { ...cart, lines };
}

/**
 * Repair one stored line, or null when it cannot be trusted (missing id/name/price).
 * Numeric strings are accepted; a bad image or currency gets a safe default.
 * @param {unknown} raw
 * @returns {CartLine | null}
 */
export function sanitizeLine(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { productId, name, unitPrice, quantity, stock, currency, image } = raw;
  const [price, qty, units] = [unitPrice, quantity, stock].map(Number);
  if (typeof productId !== 'string' || !productId || typeof name !== 'string') return null;
  if (!Number.isInteger(price) || price < 0 || !Number.isInteger(units) || units < 0) return null;
  if (!Number.isFinite(qty) || qty < 1) return null;
  const goodImage =
    image && typeof image.url === 'string'
      ? { url: image.url, alt: String(image.alt ?? '') }
      : PLACEHOLDER_IMAGE;
  return {
    productId,
    name,
    unitPrice: price,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : 'USD',
    stock: units,
    quantity: Math.min(Math.floor(qty), Math.max(1, Math.min(units, MAX_PER_LINE))),
    image: { ...goodImage },
  };
}

/**
 * Rebuild a cart from stored data that may be old, edited or corrupt: bad lines are dropped,
 * duplicates merged into the first, quantities re-clamped.
 * @param {unknown} data
 * @returns {CartState}
 */
export function rehydrate(data) {
  const raw = Array.isArray(data?.lines) ? data.lines : [];
  const lines = raw
    .map(sanitizeLine)
    .filter(Boolean)
    .filter((line, i, all) => all.findIndex((l) => l.productId === line.productId) === i);
  return { lines };
}

/**
 * Reducer form of the same pure functions, for callers that prefer actions.
 * @param {CartState} state
 * @param {{ type: 'add' | 'update' | 'remove' | 'clear' | 'sync', product?: object, productId?: string,
 *   quantity?: number, products?: object }} action
 * @returns {CartState}
 */
export function cartReducer(state, action) {
  const { type, product, productId, quantity, products } = action;
  if (type === 'add') return addToCart(state, product, quantity);
  if (type === 'update') return updateQuantity(state, productId, quantity);
  if (type === 'remove') return removeFromCart(state, productId);
  if (type === 'clear') return clearCart(state);
  if (type === 'sync') return syncWithCatalog(state, products);
  return state;
}
