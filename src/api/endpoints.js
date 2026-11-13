/**
 * src/api/endpoints.js
 *
 * Every path in one place, matching api/openapi.json.
 */

export const ENDPOINTS = Object.freeze({
  products: '/products',
  product: (/** @type {string} */ id) => `/products/${encodeURIComponent(id)}`,
  login: '/auth/login',
  register: '/auth/register',
  orders: '/account/orders',
  cancelOrder: (/** @type {string} */ id) => `/account/orders/${encodeURIComponent(id)}/cancel`,
  addresses: '/account/addresses',
  address: (/** @type {string} */ id) => `/account/addresses/${encodeURIComponent(id)}`,
  placeOrder: '/orders',
});
