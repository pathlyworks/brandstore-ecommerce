/**
 * src/api/orders.js
 *
 * POST /orders: place an order from the cart. Same request body in both API formats:
 * { items: [{ productId, qty }] } with the Bearer token (the http client adds it). The TechSphere API answers
 * 201 { id, number, status }; our mock wraps it in { data }.
 */
import { ENDPOINTS } from './endpoints.js';

/**
 * @param {import('./http.js').HttpClient} http a client created with getToken
 * @param {{ productId: string, qty: number }[]} items at least one (state/cart.js checkoutItems)
 * @returns {Promise<{ id: string, number: string, status: string }>}
 */
export async function placeOrder(http, items) {
  const body = await http.request('POST', ENDPOINTS.placeOrder, { body: { items } });
  const order = body?.data ?? body ?? {};
  return {
    id: String(order.id ?? ''),
    number: String(order.number ?? order.id ?? ''),
    status: String(order.status ?? 'processing'),
  };
}
