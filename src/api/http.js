/**
 * src/api/http.js
 *
 * The only module that calls fetch. Adds base URL, JSON headers, bearer token, a timeout, and turns every non-2xx into ApiError. On 401 it calls onUnauthorized (the app signs the user out); on 429 it does not retry automatically, it surfaces retryAfter.
 */
import { notImplemented } from '../utils/not-implemented.js';

/**
 * Factory so tests can inject a base URL and token source.
 * @param {{ baseUrl: string, getToken: () => string | null, onUnauthorized: () => void, timeoutMs?: number }} options
 * @returns {{ request: (method: string, path: string, body?: unknown) => Promise<unknown> }}
 */
export function createHttpClient(options) {
  return notImplemented('api/http.createHttpClient');
}
