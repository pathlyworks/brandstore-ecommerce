/**
 * src/api/account.js
 *
 * The signed-in account endpoints. Every call goes through an http client created with
 * `getToken`, so each request carries `Authorization: Bearer <token>` in a HEADER (never in the URL).
 * Responses are normalised to one app shape for both API formats (src/api/techsphere.js translates
 * the TechSphere bodies; the BrandStore mock is normalised here).
 *
 *   Order:   { id, createdAt, status, items: [{ productId, name, quantity }], total (cents), currency, cancellable }
 *   Address: { id, label, street, city, raw }
 */
import { ENDPOINTS } from './endpoints.js';
import { buildQuery } from '../utils/query-string.js';

/** @typedef {{ request: (method: string, path: string, init?: object) => Promise<any> }} HttpClient */

/**
 * One order in the app shape (BrandStore mock fields; TechSphere orders arrive already translated).
 * @param {any} o
 * @returns {object}
 */
export function toOrder(o) {
  const items = Array.isArray(o.items) ? o.items : [];
  return {
    id: String(o.id),
    createdAt: String(o.createdAt ?? o.created_at ?? ''),
    status: String(o.status ?? ''),
    items: items.map((i) => ({
      productId: i.productId,
      name: i.name ?? null,
      quantity: i.quantity ?? i.qty ?? 1,
    })),
    total: Number.isInteger(o.total) ? o.total : 0,
    currency: o.currency || 'USD',
    cancellable: o.cancellable ?? o.status === 'processing',
  };
}

/**
 * One address in the app shape.
 * @param {any} a
 * @returns {{ id: string, label: string, street: string, city: string, raw: object }}
 */
export function toAddress(a) {
  return {
    id: String(a.id),
    label: a.label ?? '',
    street: a.street ?? a.line1 ?? '',
    city: a.city ?? '',
    raw: { ...a },
  };
}

/**
 * GET /account/orders (a page of orders, newest first as the API sends them).
 * @param {HttpClient} http
 * @param {{ page?: number, limit?: number, signal?: AbortSignal }} [options]
 * @returns {Promise<{ data: object[], meta: { page: number, limit: number, total: number, totalPages: number } }>}
 */
export async function listOrders(http, { page = 1, limit = 5, signal } = {}) {
  const body = await http.request('GET', `${ENDPOINTS.orders}${buildQuery({ limit, page })}`, {
    signal,
  });
  const meta = body.meta ?? { page, limit, total: body.data.length, totalPages: 1 };
  return { data: body.data.map(toOrder), meta };
}

/**
 * PATCH /account/orders/{id}/cancel.
 * @param {HttpClient} http
 * @param {string} id
 * @returns {Promise<object>} the updated order
 */
export async function cancelOrder(http, id) {
  const body = await http.request('PATCH', ENDPOINTS.cancelOrder(id));
  return toOrder(body.data ?? body);
}

/**
 * GET /account/addresses.
 * @param {HttpClient} http
 * @returns {Promise<object[]>}
 */
export async function listAddresses(http) {
  const body = await http.request('GET', ENDPOINTS.addresses);
  return (body.data ?? body).map(toAddress);
}

/**
 * PUT /account/addresses/{id} with the edited street and city (other stored fields are kept).
 * @param {HttpClient} http
 * @param {{ id: string, street: string, city: string, raw: object }} address
 * @returns {Promise<object>} the saved address
 */
export async function updateAddress(http, { id, street, city, raw = {} }) {
  const { id: _id, ...kept } = raw;
  const body = await http.request('PUT', ENDPOINTS.address(id), {
    body: { ...kept, street, city, ...('line1' in raw ? { line1: street } : {}) },
  });
  return toAddress(body.data ?? body);
}

/**
 * DELETE /account/addresses/{id} (204 or 200, no body needed).
 * @param {HttpClient} http
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteAddress(http, id) {
  await http.request('DELETE', ENDPOINTS.address(id));
}
