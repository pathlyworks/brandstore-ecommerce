/**
 * src/api/orders.js
 *
 * Order endpoints (need a token).
 */
import { notImplemented } from '../utils/not-implemented.js';

/** @typedef {import('./products.js').HttpClient} HttpClient */

/**
 * GET /account/orders
 * @param {HttpClient} http
 * @param {{ status?: string, page?: number, limit?: number }} query
 * @returns {Promise<{ data: object[], meta: object }>}
 */
export function listOrders(http, query) {
  return notImplemented('api/orders.listOrders');
}

/**
 * PATCH /account/orders/{id}/cancel
 * @param {HttpClient} http
 * @param {string} id
 * @param {string} reason optional
 * @returns {Promise<object>}
 */
export function cancelOrder(http, id, reason) {
  return notImplemented('api/orders.cancelOrder');
}
