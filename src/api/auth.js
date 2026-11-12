/**
 * src/api/auth.js
 *
 * Login endpoint.
 */
import { notImplemented } from '../utils/not-implemented.js';

/** @typedef {import('./products.js').HttpClient} HttpClient */

/**
 * POST /auth/login
 * @param {HttpClient} http
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ token: string, expiresIn: number, user: object }>}
 */
export function login(http, credentials) {
  return notImplemented('api/auth.login');
}
