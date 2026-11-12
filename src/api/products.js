/**
 * src/api/products.js
 *
 * Catalog endpoints. Pure wrappers: build the URL, call http, return data.
 */
import { notImplemented } from '../utils/not-implemented.js';

/** @typedef {{ request: (method: string, path: string, body?: unknown) => Promise<any> }} HttpClient */

/**
 * GET /products
 * @param {HttpClient} http
 * @param {import("../utils/query-string.js").CatalogQuery} query
 * @returns {Promise<{ data: object[], meta: object }>}
 */
export function listProducts(http, query) {
  return notImplemented('api/products.listProducts');
}

/**
 * GET /products/{id}
 * @param {HttpClient} http
 * @param {string} id
 * @returns {Promise<object>}
 */
export function getProduct(http, id) {
  return notImplemented('api/products.getProduct');
}
