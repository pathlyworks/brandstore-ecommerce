/**
 * src/api/addresses.js
 *
 * Address book endpoints (need a token).
 */
import { notImplemented } from '../utils/not-implemented.js';

/** @typedef {import('./products.js').HttpClient} HttpClient */

/**
 * GET /account/addresses
 * @param {HttpClient} http
 * @returns {Promise<object[]>}
 */
export function listAddresses(http) {
  return notImplemented('api/addresses.listAddresses');
}

/**
 * PUT /account/addresses/{id}; created is true on 201.
 * @param {HttpClient} http
 * @param {{ id: string } & Record<string, unknown>} address
 * @returns {Promise<{ address: object, created: boolean }>}
 */
export function saveAddress(http, address) {
  return notImplemented('api/addresses.saveAddress');
}

/**
 * DELETE /account/addresses/{id}
 * @param {HttpClient} http
 * @param {string} id
 * @returns {Promise<void>}
 */
export function deleteAddress(http, id) {
  return notImplemented('api/addresses.deleteAddress');
}
