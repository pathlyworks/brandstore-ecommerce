/**
 * src/utils/validate.js
 *
 * Client-side checks that mirror the API 400 rules (email, address fields) so most errors are caught before a request.
 */
import { notImplemented } from './not-implemented.js';

/** @typedef {{ field: string, message: string }} FieldError */

/**
 * Same rules as POST /auth/login.
 * @param {{ email: string, password: string }} input
 * @returns {FieldError[]}
 */
export function validateLogin(input) {
  return notImplemented('utils/validate.validateLogin');
}

/**
 * Same rules as PUT /account/addresses/{id}.
 * @param {Record<string, unknown>} input
 * @returns {FieldError[]}
 */
export function validateAddress(input) {
  return notImplemented('utils/validate.validateAddress');
}
