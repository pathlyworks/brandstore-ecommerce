/**
 * src/utils/query-string.js
 *
 * Build and parse the /products and /account/orders query strings. HIGH RISK: a wrong string means wrong results or a 400.
 */
import { notImplemented } from './not-implemented.js';

/**
 * @typedef {{ category?: string, q?: string, minPrice?: number, maxPrice?: number,
 *   inStock?: boolean, sort?: string, page: number, limit: number }} CatalogQuery
 */

/**
 * Drops null/undefined/"" values, encodes with URLSearchParams, sorts keys (stable URLs and cache keys). Returns "" or "?a=1&b=2".
 * @param {Record<string, string | number | boolean | null | undefined>} params
 * @returns {string}
 */
export function buildQuery(params) {
  return notImplemented('utils/query-string.buildQuery');
}

/**
 * Reads category, q, minPrice, maxPrice, inStock, sort, page, limit; invalid values fall back to defaults instead of reaching the API.
 * @param {string} search location.search
 * @returns {CatalogQuery}
 */
export function parseCatalogQuery(search) {
  return notImplemented('utils/query-string.parseCatalogQuery');
}
