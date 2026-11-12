/**
 * src/state/recent.js
 *
 * Recently viewed products as PURE functions over an array (no DOM, storage or network). Viewing a
 * product moves it to the front; no duplicates; at most RECENT_LIMIT entries. Persistence
 * (sessionStorage) lives in state/stores.js.
 */

export const RECENT_LIMIT = 6;

/**
 * The few fields the strip needs.
 * @param {object} product API product
 * @returns {{ id: string, name: string, price: number, currency: string, image: object }}
 */
export function toRecent({ id, name, price, currency = 'USD', image }) {
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
 * Rebuild the list from stored data that may be corrupt: keep well-formed entries, first of each id,
 * at most RECENT_LIMIT.
 * @param {unknown} data
 * @returns {object[]}
 */
export function rehydrateRecent(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        Number.isInteger(p.price) &&
        p.price >= 0 &&
        p.image &&
        typeof p.image.url === 'string',
    )
    .filter((p, i, all) => all.findIndex((x) => x.id === p.id) === i)
    .slice(0, RECENT_LIMIT)
    .map(toRecent);
}
