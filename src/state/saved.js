/**
 * src/state/saved.js
 *
 * Save-for-later list. Persisted in localStorage ("brandstore:saved:v1"), same lifetime as the cart; moving an item back to the cart is one action.
 */
import { notImplemented } from '../utils/not-implemented.js';

/**
 * { items, save(line), moveToCart(id, cart), remove(id) }
 * @param {typeof import("../utils/storage.js")} storage
 * @returns {object}
 */
export function createSaved(storage) {
  return notImplemented('state/saved.createSaved');
}
