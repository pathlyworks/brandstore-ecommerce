/**
 * src/utils/money.js
 *
 * Integer-cent money helpers. No floating point anywhere in money math.
 */

const formatters = new Map();

/**
 * Parse a decimal amount to integer cents (rounds half away from zero). Returns NaN for bad input.
 * @param {string | number} amount a decimal amount such as "19.99" or 19.99
 * @returns {number}
 */
export function toCents(amount) {
  const text = String(amount).trim();
  if (!/^\d+(\.\d+)?$/.test(text)) return NaN;
  const [whole, fraction = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(3, '0').slice(0, 2));
  return Number(fraction[2] || 0) >= 5 ? cents + 1 : cents;
}

/**
 * Format cents for display with Intl.NumberFormat.
 * @param {number} cents integer cents
 * @param {string} [currency] ISO 4217 code, default "USD"
 * @param {string} [locale] BCP 47 locale, default "en-US"
 * @returns {string}
 */
export function formatMoney(cents, currency = 'USD', locale = 'en-US') {
  const key = `${locale}|${currency}`;
  if (!formatters.has(key)) {
    formatters.set(key, new Intl.NumberFormat(locale, { style: 'currency', currency }));
  }
  return formatters.get(key).format(cents / 100);
}
