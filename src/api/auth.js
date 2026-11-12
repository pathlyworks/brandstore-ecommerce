/**
 * src/api/auth.js
 *
 * POST /auth/login and POST /auth/register. Credentials travel only in the JSON request BODY
 * (never in the URL or query string) and are never logged. Both return the session built by
 * sessionFromResponse (token, expiry, user), for either API format.
 *
 * Errors keep their status so the form can tell them apart: 400 = the details were not accepted
 * (e.g. "Email already registered"), 401 = wrong email or password.
 */
import { expiryOf } from '../utils/jwt.js';
import { ENDPOINTS } from './endpoints.js';

/** @typedef {{ request: (method: string, path: string, init?: object) => Promise<any> }} HttpClient */

/**
 * Build a session from a login/register response of either API:
 * TechSphere `{ token, user }` or the BrandStore mock `{ data: { token, expiresIn, user } }`.
 * @param {any} body
 * @param {number} now ms since 1970
 * @returns {{ token: string, expiresAt: number, user: { email: string, name: string, role: string } }}
 */
export function sessionFromResponse(body, now) {
  const { token, expiresIn, user = {} } = body?.data ?? body ?? {};
  if (typeof token !== 'string' || !token) throw new Error('The sign-in response had no token.');
  const { email = '', name = '', role = 'shopper' } = user;
  return { token, expiresAt: expiryOf(token, now, expiresIn), user: { email, name, role } };
}

/**
 * Sign in.
 * @param {HttpClient} http a client WITHOUT onUnauthorized (a 401 here means wrong credentials)
 * @param {{ email: string, password: string }} credentials
 * @param {() => number} [now]
 * @returns {Promise<{ token: string, expiresAt: number, user: object }>}
 */
export async function login(http, { email, password }, now = () => Date.now()) {
  const body = await http.request('POST', ENDPOINTS.login, {
    body: { email: email.trim(), password },
  });
  return sessionFromResponse(body, now());
}

/**
 * Create an account (and sign in).
 * @param {HttpClient} http
 * @param {{ name: string, email: string, password: string }} details
 * @param {() => number} [now]
 * @returns {Promise<{ token: string, expiresAt: number, user: object }>}
 */
export async function register(http, { name, email, password }, now = () => Date.now()) {
  const body = await http.request('POST', ENDPOINTS.register, {
    body: { name: name.trim(), email: email.trim(), password },
  });
  return sessionFromResponse(body, now());
}
