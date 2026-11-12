/**
 * src/state/saved.js
 *
 * Save-for-later ("parked") items: pure functions over a state object, persisted separately from the
 * cart in localStorage "brandstore:saved:v1". Moving between the two lists is a pure function that
 * returns both new states, so an item is never in both or lost in between.
 */
import { createStore } from './store.js';
import { KEYS } from '../utils/storage.js';
import { addToCart, canAdd, removeFromCart } from './cart.js';
import { clampQuantity } from '../utils/cart-math.js';

/** @typedef {import('../utils/cart-math.js').CartLine} CartLine */
/** @typedef {{ items: CartLine[] }} SavedState */

/** @type {SavedState} */
export const EMPTY_SAVED = Object.freeze({ items: [] });

/**
 * Park a line (or a product turned into a line). Saving again replaces the older entry.
 * @param {SavedState} saved
 * @param {CartLine} line
 * @returns {SavedState}
 */
export function saveItem(saved, line) {
  const { items } = saved;
  return {
    ...saved,
    items: [{ ...line }, ...items.filter((item) => item.productId !== line.productId)],
  };
}

/**
 * Remove a parked item.
 * @param {SavedState} saved
 * @param {string} productId
 * @returns {SavedState}
 */
export function removeSaved(saved, productId) {
  return { ...saved, items: saved.items.filter((item) => item.productId !== productId) };
}

/**
 * Move a cart line to the saved list.
 * @param {{ cart: object, saved: SavedState }} lists
 * @param {string} productId
 * @returns {{ cart: object, saved: SavedState }}
 */
export function moveToSaved({ cart, saved }, productId) {
  const line = cart.lines.find((l) => l.productId === productId);
  if (!line) return { cart, saved };
  return { cart: removeFromCart(cart, productId), saved: saveItem(saved, line) };
}

/**
 * Move a saved item into the cart. Refused (both unchanged, with the reason) when it cannot be added.
 * @param {{ cart: object, saved: SavedState }} lists
 * @param {string} productId
 * @returns {{ cart: object, saved: SavedState, reason: string }}
 */
export function moveToCart({ cart, saved }, productId) {
  const item = saved.items.find((i) => i.productId === productId);
  if (!item) return { cart, saved, reason: '' };
  const product = {
    id: item.productId,
    name: item.name,
    price: item.unitPrice,
    currency: item.currency,
    stock: item.stock,
    image: item.image,
  };
  const check = canAdd(cart, product);
  if (!check.ok) return { cart, saved, reason: check.reason };
  return {
    cart: addToCart(cart, product, clampQuantity(item.quantity, item.stock)),
    saved: removeSaved(saved, productId),
    reason: '',
  };
}

/**
 * Keep only well-formed items from stored data.
 * @param {unknown} data
 * @returns {SavedState}
 */
export function rehydrateSaved(data) {
  const items = Array.isArray(data?.items) ? data.items : [];
  return {
    items: items.filter(
      (i) =>
        i &&
        typeof i.productId === 'string' &&
        Number.isInteger(i.unitPrice) &&
        typeof i.name === 'string',
    ),
  };
}

/**
 * A persisted saved-for-later store.
 * @param {{ readJson: Function, writeJson: Function }} storage
 * @param {Window} [win]
 * @returns {{ get: () => SavedState, set: (next: SavedState) => void, subscribe: Function }}
 */
export function createSaved(storage, win = window) {
  const store = createStore(rehydrateSaved(storage.readJson('local', KEYS.saved, EMPTY_SAVED)));
  win.addEventListener('storage', (event) => {
    if (event.key === KEYS.saved)
      store.set(rehydrateSaved(storage.readJson('local', KEYS.saved, EMPTY_SAVED)));
  });
  return {
    get: store.get,
    set(next) {
      storage.writeJson('local', KEYS.saved, next);
      store.set(next);
    },
    subscribe: store.subscribe,
  };
}
