/**
 * src/utils/cart-math.js
 *
 * Pure cart arithmetic. HIGHEST RISK module (money): unit tested exhaustively.
 */
import { notImplemented } from './not-implemented.js';

/**
 * @typedef {{ productId: string, name: string, unitPrice: number, quantity: number, stock: number }} CartLine
 * @typedef {{ itemCount: number, subtotal: number, shipping: number, total: number }} CartTotals
 */

/**
 * unitPrice x quantity, in cents.
 * @param {CartLine} line
 * @returns {number}
 */
export function lineTotal(line) {
  return notImplemented('utils/cart-math.lineTotal');
}

/**
 * Sum of line totals, in cents.
 * @param {CartLine[]} lines
 * @returns {number}
 */
export function subtotal(lines) {
  return notImplemented('utils/cart-math.subtotal');
}

/**
 * 0 when subtotal >= 10000 cents ($100), else 799 (same rule as the API orders).
 * @param {number} subtotalCents
 * @returns {number}
 */
export function shippingFor(subtotalCents) {
  return notImplemented('utils/cart-math.shippingFor');
}

/**
 * { itemCount, subtotal, shipping, total } in cents.
 * @param {CartLine[]} lines
 * @returns {CartTotals}
 */
export function totals(lines) {
  return notImplemented('utils/cart-math.totals');
}

/**
 * Integer between 1 and min(stock, 10); NaN or < 1 becomes 1.
 * @param {number} quantity requested quantity
 * @param {number} stock units available
 * @returns {number}
 */
export function clampQuantity(quantity, stock) {
  return notImplemented('utils/cart-math.clampQuantity');
}
