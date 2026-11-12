/**
 * src/utils/money.js
 *
 * Integer-cent money helpers. No floating point anywhere in money math.
 */
import { notImplemented } from './not-implemented.js';

/**
 * Parse a decimal amount to integer cents (rounds half away from zero).
 * @param {string | number} amount a decimal amount such as "19.99" or 19.99
 * @returns {number}
 */
export function toCents(amount) {
  return notImplemented('utils/money.toCents');
}

/**
 * Format cents for display with Intl.NumberFormat.
 * @param {number} cents integer cents
 * @param {string} currency ISO 4217 code, e.g. "USD"
 * @param {string} locale BCP 47 locale, default "en-US"
 * @returns {string}
 */
export function formatMoney(cents, currency, locale) {
  return notImplemented('utils/money.formatMoney');
}
