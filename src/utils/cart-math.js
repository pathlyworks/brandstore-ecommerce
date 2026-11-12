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
 * Check a requested quantity against the bounds: at least 1, at most the stock, at most MAX_PER_LINE.
 * Returns the quantity to use and, when the request was changed, a message saying why.
 * @param {unknown} requested what the shopper typed or asked for
 * @param {number} stock units available
 * @returns {{ quantity: number, status: 'ok' | 'invalid' | 'min' | 'stock' | 'limit' | 'out', message: string }}
 */
export function validateQuantity(requested, stock) {
  const most = Math.min(stock, MAX_PER_LINE);
  if (stock <= 0) return { quantity: 0, status: 'out', message: 'Out of stock.' };
  const wanted = Number(requested);
  if (!Number.isFinite(wanted) || String(requested).trim() === '') {
    return { quantity: 1, status: 'invalid', message: 'Enter a whole number of items.' };
  }
  const whole = Math.floor(wanted);
  if (whole < 1) return { quantity: 1, status: 'min', message: 'The smallest quantity is 1.' };
  if (whole > stock && stock <= MAX_PER_LINE) {
    return { quantity: most, status: 'stock', message: `Only ${stock} in stock.` };
  }
  if (whole > MAX_PER_LINE) {
    return { quantity: most, status: 'limit', message: `The limit is ${MAX_PER_LINE} per item.` };
  }
  return { quantity: whole, status: 'ok', message: '' };
}

/**
 * A whole quantity between 1 and min(stock, MAX_PER_LINE) (validateQuantity without the message).
 * @param {unknown} quantity requested quantity
 * @param {number} stock units available
 * @returns {number}
 */
export function clampQuantity(quantity, stock) {
  return Math.max(1, validateQuantity(quantity, stock).quantity);
}
