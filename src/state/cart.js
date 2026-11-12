/**
 * src/state/cart.js
 *
 * The cart as pure functions over a state object, plus a small store that persists it.
 *
 * Pure functions (no side effects; every update uses destructuring and spread and returns a NEW
 * state, the old one is never changed): addToCart, updateQuantity, removeFromCart, clearCart,
 * canAdd. The store (createCart) saves every new state to localStorage "brandstore:cart:v1" and
 * rehydrates it on load, so the cart survives refresh, closing the tab and return visits.
 */
import { clampQuantity, MAX_PER_LINE, totals } from '../utils/cart-math.js';
import { KEYS } from '../utils/storage.js';
import { createStore } from './store.js';

/** @typedef {import('../utils/cart-math.js').CartLine} CartLine */
/** @typedef {{ lines: CartLine[] }} CartState */

/** @type {CartState} */
export const EMPTY_CART = Object.freeze({ lines: [] });

/**
 * Turn an API product (GET /products or /products/{id}) into a cart line.
 * @param {object} product
 * @param {number} quantity
 * @returns {CartLine}
 */
export function toLine({ id, name, price, currency, stock, image }, quantity) {
  return { productId: id, name, unitPrice: price, currency, stock, quantity, image: { ...image } };
}

/**
 * Can this product be added (again)? Explains why not.
 * @param {CartState} cart
 * @param {{ id: string, stock: number }} product
 * @returns {{ ok: boolean, reason: string }}
 */
export function canAdd({ lines }, { id, stock }) {
  if (stock <= 0)
    return { ok: false, reason: 'Out of stock: this item cannot be added to the cart right now.' };
  const inCart = lines.find((line) => line.productId === id)?.quantity || 0;
  const most = Math.min(stock, MAX_PER_LINE);
  if (inCart >= most) {
    return { ok: false, reason: `You already have the most we can sell of this item (${most}).` };
  }
  return { ok: true, reason: '' };
}

/**
 * Add a product (or more of it). Refused (state returned unchanged) when canAdd says no.
 * @param {CartState} cart
 * @param {object} product API product
 * @param {number} [quantity]
 * @returns {CartState}
 */
export function addToCart(cart, product, quantity = 1) {
  if (!canAdd(cart, product).ok) return cart;
  const { lines } = cart;
  const existing = lines.find((line) => line.productId === product.id);
  if (!existing) {
    return { ...cart, lines: [...lines, toLine(product, clampQuantity(quantity, product.stock))] };
  }
  return updateQuantity(
    cart,
    product.id,
    existing.quantity + clampQuantity(quantity, product.stock),
  );
}

/**
 * Set a line's quantity (clamped to 1..min(stock, 10)).
 * @param {CartState} cart
 * @param {string} productId
 * @param {number} quantity
 * @returns {CartState}
 */
export function updateQuantity(cart, productId, quantity) {
  return {
    ...cart,
    lines: cart.lines.map((line) =>
      line.productId === productId
        ? { ...line, quantity: clampQuantity(quantity, line.stock) }
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
  return { ...cart, lines: cart.lines.filter((line) => line.productId !== productId) };
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
 * Bring stored lines up to date with the catalog: current price, stock and name (spread, never
 * mutation). A product the API no longer has (missing from `products`) gets stock 0. Returns the
 * same array when nothing changed.
 * @param {CartLine[]} lines
 * @param {Record<string, object | null>} products by id; null = not found
 * @returns {CartLine[]}
 */
export function syncLines(lines, products) {
  let changed = false;
  const next = lines.map((line) => {
    if (!(line.productId in products)) return line;
    const { price = line.unitPrice, stock = 0, name = line.name } = products[line.productId] || {};
    if (price === line.unitPrice && stock === line.stock && name === line.name) return line;
    changed = true;
    return {
      ...line,
      unitPrice: price,
      stock,
      name,
      quantity: Math.min(line.quantity, Math.max(1, Math.min(stock, MAX_PER_LINE))),
    };
  });
  return changed ? next : lines;
}

/**
 * Human-readable price changes between stored lines and the catalog.
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
 * Lines that can be bought now (in stock); out-of-stock lines stay in the cart but are not charged.
 * @param {CartState} cart
 * @returns {CartLine[]}
 */
export function availableLines({ lines }) {
  return lines.filter(({ stock }) => stock > 0);
}

/**
 * Apply catalog data to the whole cart (a pure state update for cart.apply).
 * @param {CartState} cart
 * @param {Record<string, object | null>} products
 * @returns {CartState}
 */
export function syncWithCatalog(cart, products) {
  const lines = syncLines(cart.lines, products);
  return lines === cart.lines ? cart : { ...cart, lines };
}

/**
 * Keep only well-formed lines from stored data (it may be old, edited or corrupt).
 * @param {unknown} data
 * @returns {CartState}
 */
export function rehydrate(data) {
  const lines = Array.isArray(data?.lines) ? data.lines : [];
  const valid = lines.filter(
    (l) =>
      l &&
      typeof l.productId === 'string' &&
      Number.isInteger(l.unitPrice) &&
      l.unitPrice >= 0 &&
      Number.isInteger(l.quantity) &&
      l.quantity > 0 &&
      Number.isInteger(l.stock) &&
      typeof l.name === 'string',
  );
  return {
    lines: valid.map((line) => ({ ...line, quantity: clampQuantity(line.quantity, line.stock) })),
  };
}

/**
 * A persisted cart store. `storage` is utils/storage.js (injected so tests can use a fake).
 * @param {{ readJson: Function, writeJson: Function }} storage
 * @param {Window} [win] for the cross-tab "storage" event
 * @returns {{ get: () => CartState, totals: () => object, apply: (fn: Function, ...args: any[]) => CartState,
 *   subscribe: Function }}
 */
export function createCart(storage, win = window) {
  const store = createStore(rehydrate(storage.readJson('local', KEYS.cart, EMPTY_CART)));
  win.addEventListener('storage', (event) => {
    if (event.key === KEYS.cart)
      store.set(rehydrate(storage.readJson('local', KEYS.cart, EMPTY_CART)));
  });
  return {
    get: store.get,
    totals: () => totals(store.get().lines),
    apply(fn, ...args) {
      const next = fn(store.get(), ...args);
      if (next !== store.get()) {
        storage.writeJson('local', KEYS.cart, next);
        store.set(next);
      }
      return next;
    },
    subscribe: store.subscribe,
  };
}
