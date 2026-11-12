/**
 * tests/support/api-handlers.js — Mock Service Worker handlers for the catalog API in the app's own
 * format (api/openapi.json), built from the mock server's seed products. Integration tests start
 * from these "200" handlers and override one route per test for empty, 401, 429 and 500 answers.
 */
import { http, HttpResponse } from 'msw';
import { PRODUCTS } from '../../mock-server/data.mjs';

/** Where the app under test sends API requests (same origin as the test page). */
export const API = `${globalThis.location?.origin ?? 'http://localhost:3000'}/api`;

/** Every request the handlers saw, for asserting what the app asked for. */
export const seen = [];

/**
 * GET /products: q, category, brand, page and limit, like the real API.
 * @param {URL} url
 * @returns {{ data: object[], meta: object }}
 */
function listFor(url) {
  const q = url.searchParams;
  const term = (q.get('q') || '').toLowerCase();
  const list = PRODUCTS.filter(
    (p) =>
      (!q.get('category') || p.category === q.get('category')) &&
      (!q.get('brand') || p.brand === q.get('brand')) &&
      (!term || p.name.toLowerCase().includes(term)),
  );
  const page = Number(q.get('page') || 1);
  const limit = Number(q.get('limit') || 12);
  return {
    data: list.slice((page - 1) * limit, page * limit),
    meta: {
      page,
      limit,
      total: list.length,
      totalPages: Math.max(1, Math.ceil(list.length / limit)),
    },
  };
}

/** The "everything works" handlers. */
export const handlers = [
  http.get(`${API}/products`, ({ request }) => {
    seen.push(request.url);
    return HttpResponse.json(listFor(new URL(request.url)));
  }),
  http.get(`${API}/products/:id`, ({ request, params }) => {
    seen.push(request.url);
    const product = PRODUCTS.find((p) => p.id === params.id);
    if (!product) {
      return HttpResponse.json(
        { error: { code: 'NOT_FOUND', message: `Product "${params.id}" was not found.` } },
        { status: 404 },
      );
    }
    return HttpResponse.json({ data: product });
  }),
];

/**
 * An API error body in the app's format, with an optional Retry-After header.
 * @param {number} status
 * @param {{ retryAfter?: number }} [options]
 * @returns {Response}
 */
export function apiError(status, { retryAfter } = {}) {
  const codes = { 401: 'UNAUTHORIZED', 429: 'RATE_LIMITED', 500: 'INTERNAL_ERROR' };
  return HttpResponse.json(
    { error: { code: codes[status] || `HTTP_${status}`, message: `Mock ${status}` } },
    { status, headers: retryAfter ? { 'Retry-After': String(retryAfter) } : {} },
  );
}
