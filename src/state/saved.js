/**
 * src/state/saved.js
 *
 * Save-for-later ("parked") items as PURE functions over `{ items: CartLine[] }` (no DOM, storage or
 * network). Moving between the cart and this list returns both new states, so an item is never in
 * both lists or lost. Persistence lives in state/stores.js (localStorage, separate key).
 */
import { addToCart, canAdd, removeFromCart, sanitizeLine } from './cart.js';

/** @typedef {import('../utils/cart-math.js').CartLine} CartLine */
/** @typedef {{ items: CartLine[] }} SavedState */

/** @type {SavedState} */
export const EMPTY_SAVED = Object.freeze({ items: Object.freeze([]) });

/**
 * Park a line. Saving the same product again replaces the older entry and moves it to the top.
 * @param {SavedState} saved
 * @param {CartLine} line
 * @returns {SavedState}
 */
export function saveItem(saved, line) {
  const { items } = saved;
  return {
    ...saved,
    items: [{ ...line }, ...items.filter(({ productId }) => productId !== line.productId)],
  };
}

/**
 * Remove a parked item.
 * @param {SavedState} saved
 * @param {string} productId
 * @returns {SavedState}
 */
export function removeSaved(saved, productId) {
  const { items } = saved;
  return { ...saved, items: items.filter((item) => item.productId !== productId) };
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
 * The product shape the cart functions expect, from a saved line.
 * @param {CartLine} item
 * @returns {object}
 */
function asProduct({ productId, name, unitPrice, currency, stock, image }) {
  return { id: productId, name, price: unitPrice, currency, stock, image };
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
  const check = canAdd(cart, asProduct(item), item.quantity);
  if (!check.ok) return { cart, saved, reason: check.reason };
  return {
    cart: addToCart(cart, asProduct(item), item.quantity),
    saved: removeSaved(saved, productId),
    reason: '',
  };
}

/**
 * Rebuild the saved list from stored data that may be corrupt (same repairs as the cart).
 * @param {unknown} data
 * @returns {SavedState}
 */
export function rehydrateSaved(data) {
  const raw = Array.isArray(data?.items) ? data.items : [];
  const items = raw
    .map(sanitizeLine)
    .filter(Boolean)
    .filter((item, i, all) => all.findIndex((x) => x.productId === item.productId) === i);
  return { items };
}
