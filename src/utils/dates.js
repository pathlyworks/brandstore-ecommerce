/**
 * src/utils/dates.js
 *
 * Order dates arrive in several formats (the TechSphere API mixes them):
 *   "2026-08-01T10:15:00Z", "2026-08-03T18:40:00+03:00" (ISO 8601), "02/08/2026" (day/month/year,
 *   as written in Egypt), "4 Aug 2026". This module reads all of them and shows one format.
 */

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * A UTC date, or null when the parts are not a real calendar date.
 * @param {number} year
 * @param {number} month 1-12
 * @param {number} day
 * @returns {Date | null}
 */
function utcDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

/**
 * Parse an order date; null when it cannot be read.
 * @param {string} text
 * @returns {Date | null}
 */
export function parseOrderDate(text) {
  const value = String(text ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}([T ][\d:.]+)?(Z|[+-]\d{2}:?\d{2})?$/.test(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (dmy) return utcDate(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));
  const named = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\.?\s+(\d{4})$/.exec(value);
  if (named) {
    const month = MONTHS.indexOf(named[2].toLowerCase()) + 1;
    return month ? utcDate(Number(named[3]), month, Number(named[1])) : null;
  }
  return null;
}

/**
 * "1 Aug 2026" (UTC calendar day), or the original text when it cannot be read.
 * @param {string} text
 * @returns {string}
 */
export function formatOrderDate(text) {
  const date = parseOrderDate(text);
  if (!date) return String(text ?? '');
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
