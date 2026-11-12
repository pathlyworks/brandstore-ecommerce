/**
 * src/api/product-api.js
 *
 * The one API module that uses Axios (vendored ES-module build in src/vendor/axios.js, v1.19.0).
 * It serves the product detail page and the cart's price/stock refresh: GET /products/{id}.
 *
 * Why Axios here: one shared instance with interceptors keeps cross-cutting rules in one place.
 *  - request interceptor: adds Accept and X-Client-Id headers and records when the request started;
 *  - response interceptor: records the duration and turns every failure into the same ApiError the
 *    fetch-based modules throw, so components handle both identically.
 * Why the rest of the app uses fetch (src/api/http.js): it is built into every browser (0 KB versus
 * about 48 KB for Axios), works with AbortController natively (the catalog cancels superseded
 * searches), and the catalog needs nothing Axios adds. See task_3_cart.md section 6.
 */
import axios from '../vendor/axios.js';
import { API_BASE_URL } from '../config.js';
import { ApiError } from './errors.js';
import { ENDPOINTS } from './endpoints.js';

/** Identifies this browser tab to the API (used for rate limiting on the server). */
const CLIENT_ID = `web-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Request interceptor: common headers and a start time.
 * @param {import('../vendor/axios.js').InternalAxiosRequestConfig} config
 * @returns {object}
 */
export function addRequestDefaults(config) {
  config.headers.set('Accept', 'application/json');
  config.headers.set('X-Client-Id', CLIENT_ID);
  config.metadata = { startedAt: Date.now() };
  return config;
}

/**
 * Response-error interceptor: convert an Axios error into ApiError (cancellations pass through).
 * @param {any} error
 * @returns {Promise<never>}
 */
export function toApiError(error) {
  if (axios.isCancel(error)) return Promise.reject(error);
  const response = error.response;
  if (!response) {
    const timedOut = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    return Promise.reject(
      new ApiError(0, timedOut ? 'TIMEOUT' : 'NETWORK', 'Network request failed.'),
    );
  }
  const body = response.data?.error || {};
  return Promise.reject(
    new ApiError(
      response.status,
      body.code || `HTTP_${response.status}`,
      body.message || 'Request failed',
      body.details || [],
      Number(response.headers['retry-after']) || null,
    ),
  );
}

/**
 * Build an Axios instance with both interceptors.
 * @param {{ baseURL?: string, adapter?: Function, timeout?: number }} [options] adapter is for tests
 * @returns {import('../vendor/axios.js').AxiosInstance}
 */
export function createProductApi({ baseURL = API_BASE_URL, adapter, timeout = 10000 } = {}) {
  const instance = axios.create({ baseURL, timeout, ...(adapter ? { adapter } : {}) });
  instance.interceptors.request.use(addRequestDefaults);
  instance.interceptors.response.use((response) => {
    response.durationMs = Date.now() - response.config.metadata.startedAt;
    return response;
  }, toApiError);
  return instance;
}

/**
 * GET /products/{id}: the product with its gallery and specs.
 * @param {import('../vendor/axios.js').AxiosInstance} api
 * @param {string} id
 * @param {{ signal?: AbortSignal, headers?: Record<string, string> }} [options]
 * @returns {Promise<object>}
 */
export async function fetchProduct(api, id, { signal, headers } = {}) {
  const response = await api.get(ENDPOINTS.product(id), { signal, headers });
  return response.data.data;
}
