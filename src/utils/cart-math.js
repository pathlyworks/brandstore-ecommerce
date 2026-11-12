/**
 * src/utils/cart-math.js
 *
 * Pure cart arithmetic in integer cents (no floating point). HIGHEST RISK module: every function is
 * unit tested and the totals are checked against tests/fixtures/cart-cases.json.
 *
 * Shipping rule (same as the API's orders): free when the subtotal is $100.00 or more, otherwise a
 * flat $7.99; an empty cart has no shipping. No tax is charged in this version.
 */

/** Most units of one product per cart line. */
export const MAX_PER_LINE = 10;
/** Subtotal (cents) from which shipping is free. */
export const FREE_SHIPPING_FROM = 10000;
/** Flat shipping fee (cents) below that. */
export const SHIPPING_FEE = 799;

/**
 * @typedef {{ productId: string, name: string, unitPrice: number, currency: string, quantity: number,
 *   stock: number, image: { url: string, alt: string } }} CartLine
 * @typedef {{ itemCount: number, subtotal: number, shipping: number, total: number,
 *   freeShippingRemaining: number }} CartTotals
 */

/**
 * unitPrice x quantity, in cents.
 * @param {{ unitPrice: number, quantity: number }} line
 * @returns {number}
 */
export function lineTotal({ unitPrice, quantity }) {
  return unitPrice * quantity;
}

/**
 * Sum of line totals, in cents.
 * @param {CartLine[]} lines
 * @returns {number}
 */
export function subtotal(lines) {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}

/**
 * Shipping for a subtotal: 0 for an empty cart or from FREE_SHIPPING_FROM, else SHIPPING_FEE.
 * @param {number} subtotalCents
 * @returns {number}
 */
export function shippingFor(subtotalCents) {
  if (subtotalCents <= 0 || subtotalCents >= FREE_SHIPPING_FROM) return 0;
  return SHIPPING_FEE;
}

/**
 * Item count, subtotal, shipping, total, and how much more buys free shipping.
 * @param {CartLine[]} lines
 * @returns {CartTotals}
 */
export function totals(lines) {
  const sub = subtotal(lines);
  const shipping = shippingFor(sub);
  return {
    itemCount: lines.reduce((count, { quantity }) => count + quantity, 0),
    subtotal: sub,
    shipping,
    total: sub + shipping,
    freeShippingRemaining: sub > 0 && sub < FREE_SHIPPING_FROM ? FREE_SHIPPING_FROM - sub : 0,
  };
}

/**
 * A whole quantity between 1 and min(stock, MAX_PER_LINE). NaN, decimals, text and values below 1
 * become 1 (a line is removed with "Remove", never by typing 0).
 * @param {unknown} quantity requested quantity
 * @param {number} stock units available
 * @returns {number}
 */
export function clampQuantity(quantity, stock) {
  const wanted = Math.floor(Number(quantity));
  const most = Math.max(1, Math.min(stock, MAX_PER_LINE));
  if (!Number.isFinite(wanted) || wanted < 1) return 1;
  return Math.min(wanted, most);
}
