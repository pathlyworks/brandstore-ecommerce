/**
 * src/api/http.js
 *
 * The only module that calls fetch. It adds the base URL and JSON headers, passes the caller's
 * AbortSignal through (so a newer request can cancel an older one), adds a timeout, and turns every
 * failure into an ApiError. An aborted request is re-thrown as is (name "AbortError") so callers can
 * ignore it.
 */
import { ApiError } from './errors.js';
import { fromTechsphere, toAppError, toTechsphereRequest } from './techsphere.js';

/**
 * Parse a JSON body; null when there is none or it is not JSON.
 * @param {Response} response
 * @returns {Promise<any>}
 */
async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Combine the caller's signal with a timeout (when the browser supports AbortSignal.any).
 * @param {AbortSignal | undefined} signal
 * @param {number} timeoutMs
 * @returns {AbortSignal | undefined}
 */
function withTimeout(signal, timeoutMs) {
  if (typeof AbortSignal.any !== 'function' || typeof AbortSignal.timeout !== 'function') {
    return signal;
  }
  const timeout = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

/**
 * Build the ApiError for a non-2xx response.
 * @param {Response} response
 * @param {any} body
 * @returns {ApiError}
 */
function errorFrom(response, body) {
  const retryAfter = Number(response.headers.get('Retry-After')) || null;
  return new ApiError(
    response.status,
    body?.error?.code || `HTTP_${response.status}`,
    body?.error?.message || response.statusText || 'Request failed',
    body?.error?.details || [],
    retryAfter,
  );
}

/**
 * @param {{ baseUrl: string, fetchImpl?: typeof fetch, timeoutMs?: number,
 *   getToken?: () => string | null, onUnauthorized?: () => void }} options
 * @returns {{ get: (path: string, init?: { signal?: AbortSignal, headers?: Record<string, string> }) => Promise<any> }}
 */
export function createHttpClient({
  baseUrl,
  fetchImpl = (...args) => fetch(...args),
  timeoutMs = 10000,
  getToken = () => null,
  onUnauthorized = () => {},
  dialect = 'brandstore',
}) {
  const techsphere = dialect === 'techsphere';
  /** Send one request; resolve with the parsed JSON body or reject with ApiError / AbortError. */
  async function request(method, appPath, { signal, headers = {}, body } = {}) {
    const path = techsphere ? toTechsphereRequest(appPath) : appPath;
    const token = getToken();
    let response;
    try {
      response = await fetchImpl(baseUrl + path, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: withTimeout(signal, timeoutMs),
      });
    } catch (error) {
      if (signal?.aborted) throw error; // superseded by a newer request: let the caller ignore it
      throw new ApiError(
        0,
        error?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK',
        'Network request failed.',
      );
    }
    const data = await readJson(response);
    if (!response.ok) {
      if (response.status === 401) onUnauthorized();
      throw errorFrom(response, techsphere ? toAppError(response.status, path, data) : data);
    }
    return techsphere ? fromTechsphere(path, data) : data;
  }
  return {
    get: (path, init) => request('GET', path, init),
    request,
  };
}
