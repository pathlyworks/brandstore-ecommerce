/**
 * src/state/cart.js
 *
 * Cart lines. Persisted in localStorage ("brandstore:cart:v1") so it survives refresh, tab close and logout. Totals come from utils/cart-math.js.
 */
import { notImplemented } from '../utils/not-implemented.js';

/**
 * { lines, add(product, qty), setQuantity(id, qty), remove(id), clear(), totals() }
 * @param {typeof import("../utils/storage.js")} storage injected for tests
 * @returns {object}
 */
export function createCart(storage) {
  return notImplemented('state/cart.createCart');
}
