/**
 * src/api/products.js
 *
 * Catalog endpoints (api/openapi.json): GET /products and GET /products/{id}.
 */
import { ENDPOINTS } from './endpoints.js';
import { buildQuery, toApiQuery } from '../utils/query-string.js';

/**
 * @typedef {{ get: (path: string, init?: { signal?: AbortSignal, headers?: Record<string, string> }) => Promise<any> }} HttpClient
 * @typedef {{ signal?: AbortSignal, headers?: Record<string, string> }} RequestOptions
 */

/** The API's largest page size (spec: limit maximum 50). */
const MAX_LIMIT = 50;

/**
 * GET /products with the catalog view's filters, sort and page.
 * @param {HttpClient} http
 * @param {import('../utils/query-string.js').CatalogQuery} query
 * @param {RequestOptions} [options]
 * @returns {Promise<{ data: object[], meta: { page: number, limit: number, total: number, totalPages: number } }>}
 */
export function listProducts(http, query, options = {}) {
  return http.get(ENDPOINTS.products + toApiQuery(query), options);
}

/**
 * Every product matching the given filters, fetching further pages in parallel when needed.
 * Used for the facet counts in the filter panel.
 * @param {HttpClient} http
 * @param {Record<string, string | number | null>} filters
 * @param {RequestOptions} [options]
 * @returns {Promise<object[]>}
 */
export async function listAllProducts(http, filters, options = {}) {
  const pageUrl = (page) => ENDPOINTS.products + buildQuery({ ...filters, page, limit: MAX_LIMIT });
  const first = await http.get(pageUrl(1), options);
  const rest = await Promise.all(
    Array.from({ length: first.meta.totalPages - 1 }, (_, i) => http.get(pageUrl(i + 2), options)),
  );
  return [first, ...rest].flatMap((page) => page.data);
}

/**
 * GET /products/{id}
 * @param {HttpClient} http
 * @param {string} id
 * @param {RequestOptions} [options]
 * @returns {Promise<object>}
 */
export async function getProduct(http, id, options = {}) {
  const body = await http.get(ENDPOINTS.product(id), options);
  return body.data;
}
