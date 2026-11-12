/**
 * src/utils/query-string.js
 *
 * Build and parse the catalog query strings (the page URL and the GET /products request use the
 * same parameter names as api/openapi.json). HIGH RISK: a wrong string means wrong results or a
 * 400, so every value read from a URL is validated and falls back to a default.
 */

/**
 * @typedef {{ q: string, category: string, brand: string, minPrice: number | null,
 *   maxPrice: number | null, minRating: number | null, sort: string, page: number, limit: number }} CatalogQuery
 */

export const SORTS = ['price_asc', 'price_desc', 'rating_desc', 'name_asc'];

/** Changing any of these starts again from page 1. */
export const FILTER_KEYS = [
  'q',
  'category',
  'brand',
  'minPrice',
  'maxPrice',
  'minRating',
  'sort',
  'limit',
];

/** @type {CatalogQuery} */
export const CATALOG_DEFAULTS = Object.freeze({
  q: '',
  category: '',
  brand: '',
  minPrice: null,
  maxPrice: null,
  minRating: null,
  sort: '',
  page: 1,
  limit: 6,
});

/**
 * Drops null/undefined/""/false values, sorts keys (stable URLs), encodes with URLSearchParams.
 * @param {Record<string, string | number | boolean | null | undefined>} params
 * @returns {string} "" or "?a=1&b=2"
 */
export function buildQuery(params) {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined && value !== '' && value !== false)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([key, value]) => [key, String(value)]);
  const text = new URLSearchParams(entries).toString();
  return text ? `?${text}` : '';
}

/**
 * A whole number of cents from a URL value, or null.
 * @param {string | null} raw
 * @returns {number | null}
 */
function readCents(raw) {
  return raw !== null && /^\d{1,7}$/.test(raw) ? Number(raw) : null;
}

/**
 * An integer in [min, max], or the fallback.
 * @param {string | null} raw
 * @param {number} min
 * @param {number} max
 * @param {number} fallback
 * @returns {number}
 */
function readInt(raw, min, max, fallback) {
  const n = raw !== null && /^\d{1,4}$/.test(raw) ? Number(raw) : NaN;
  return n >= min && n <= max ? n : fallback;
}

/**
 * Read the catalog view from a query string. Invalid values become defaults, so the page never
 * sends a request the API would reject; a reversed price range is swapped.
 * @param {string} search e.g. location.search
 * @param {CatalogQuery} [defaults]
 * @returns {CatalogQuery}
 */
export function parseCatalogQuery(search, defaults = CATALOG_DEFAULTS) {
  const params = new URLSearchParams(search);
  const text = (key) => (params.get(key) || '').trim();
  const rating = text('minRating');
  let minPrice = readCents(params.get('minPrice'));
  let maxPrice = readCents(params.get('maxPrice'));
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }
  return {
    q: text('q').slice(0, 100),
    category: /^[a-z-]{1,40}$/.test(text('category')) ? text('category') : defaults.category,
    brand: /^[A-Za-z][A-Za-z0-9 &'-]{0,39}$/.test(text('brand')) ? text('brand') : defaults.brand,
    minPrice,
    maxPrice,
    minRating: /^[0-4](\.\d)?$|^5(\.0)?$/.test(rating) ? Number(rating) : defaults.minRating,
    sort: SORTS.includes(text('sort')) ? text('sort') : defaults.sort,
    page: readInt(params.get('page'), 1, 1000, defaults.page),
    limit: readInt(params.get('limit'), 1, 50, defaults.limit),
  };
}

/**
 * Query string for the page URL: same names as the API, defaults left out to keep links short.
 * @param {CatalogQuery} query
 * @param {CatalogQuery} [defaults]
 * @returns {string}
 */
export function toUrlQuery(query, defaults = CATALOG_DEFAULTS) {
  return buildQuery({
    ...query,
    page: query.page === defaults.page ? null : query.page,
    limit: query.limit === defaults.limit ? null : query.limit,
  });
}

/**
 * Query string for GET /products (page and limit always sent).
 * @param {CatalogQuery} query
 * @returns {string}
 */
export function toApiQuery(query) {
  return buildQuery(query);
}

/**
 * Apply a change to the view. Any change to a filter, the search, the sort or the page size goes
 * back to page 1; changing only the page keeps everything else.
 * @param {CatalogQuery} query
 * @param {Partial<CatalogQuery>} change
 * @returns {CatalogQuery}
 */
export function applyChange(query, change) {
  const next = { ...query, ...change };
  const filterChanged = FILTER_KEYS.some((key) => key in change && change[key] !== query[key]);
  if (filterChanged) next.page = 1;
  return next;
}
