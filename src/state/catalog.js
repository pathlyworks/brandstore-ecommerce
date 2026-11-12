/**
 * src/state/catalog.js
 *
 * Catalog filters, sort and page. The URL query string is the source of truth (shareable, back/forward work); nothing is stored.
 */
import { notImplemented } from '../utils/not-implemented.js';

/**
 * { query(), update(partial), onChange(fn) }; update resets page to 1 when a filter changes.
 * @param {Location} location
 * @param {History} history
 * @returns {object}
 */
export function createCatalogState(location, history) {
  return notImplemented('state/catalog.createCatalogState');
}
