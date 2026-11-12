/**
 * src/state/recent.js
 *
 * Recently viewed products for this visit: sessionStorage "brandstore:recent:v1" (survives refresh,
 * ends with the tab). Viewing a product moves it to the front; the list has no duplicates and is
 * capped at RECENT_LIMIT entries.
 */
import { KEYS } from '../utils/storage.js';

export const RECENT_LIMIT = 6;

/**
 * The few fields the strip needs.
 * @param {object} product API product
 * @returns {{ id: string, name: string, price: number, currency: string, image: object }}
 */
export function toRecent({ id, name, price, currency, image }) {
  return { id, name, price, currency, image: { ...image } };
}

/**
 * Put a product at the front, drop its older entry, keep at most `limit`.
 * @param {object[]} list
 * @param {object} product
 * @param {number} [limit]
 * @returns {object[]}
 */
export function addRecent(list, product, limit = RECENT_LIMIT) {
  const entry = toRecent(product);
  return [entry, ...list.filter(({ id }) => id !== entry.id)].slice(0, limit);
}

/**
 * Read the list (well-formed entries only).
 * @param {{ readJson: Function }} storage
 * @returns {object[]}
 */
export function readRecent(storage) {
  const list = storage.readJson('session', KEYS.recent, []);
  return Array.isArray(list)
    ? list
        .filter((p) => p && typeof p.id === 'string' && Number.isInteger(p.price))
        .slice(0, RECENT_LIMIT)
    : [];
}

/**
 * Record a view and return the new list.
 * @param {{ readJson: Function, writeJson: Function }} storage
 * @param {object} product
 * @returns {object[]}
 */
export function recordView(storage, product) {
  const next = addRecent(readRecent(storage), product);
  storage.writeJson('session', KEYS.recent, next);
  return next;
}
