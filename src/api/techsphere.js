/**
 * src/api/techsphere.js
 *
 * Translation between the app's own API format (the BrandStore format of mock-server/ and api/openapi.json) and
 * the official TechSphere API (the API kit: openapi.yaml + python server.py), so the rest of the app is unchanged.
 * Used only when the API address comes from VITE_API_BASE (src/config.js: API_DIALECT === 'techsphere').
 *
 * Going out (catalog query): q -> search, minPrice/maxPrice (cents) -> min_price/max_price (pounds),
 * minRating -> min_rating, sort rating_desc -> rating; limit and name_asc are not in the TechSphere API and are
 * left out (it pages by 8).
 * Coming in: { items, page, total_pages, total } -> { data, meta }; a product's price (a number, or a formatted
 * string such as "EGP 33,999") -> integer cents; stock_status -> a stock count (in_stock 25, low 3,
 * out_of_stock 0; missing -> treated as in stock); reviews_count -> reviewCount; specs object -> [{ label, value }];
 * { error: "text" } -> { error: { code, message } }.
 * Account (Task 4): /account/orders pages by offset (page/limit -> offset/limit); orders have `total` in
 * pounds and `created_at` in mixed formats; addresses are { id, city, street }; PUT bodies are cut to city and
 * street; DELETE answers 204. Sign-in bodies ({ token, user }) are read by state/session.js as they are.
 * Pure functions: no fetch, DOM or storage.
 */

/** Stock counts for the TechSphere stock_status values (the app works with counts; see state/cart.js canAdd). */
export const STOCK_FOR_STATUS = Object.freeze({ in_stock: 25, low: 3, out_of_stock: 0 });

/** Shown when a product has no image (missing, empty or not a string); see also utils/dom.js for 404s. */
const PLACEHOLDER = '/assets/product-placeholder.svg';

/** GET /products always answers 8 products a page, whatever `limit` the app would like. */
export const TECHSPHERE_PAGE_SIZE = 8;

/**
 * An image from the API as a URL the browser can load, or null. Absolute URLs (a CDN) are used as they are.
 * Root-relative paths ("/images/p-001.webp") point at the API's own /images endpoint, which the spec says
 * answers a JSON placeholder, not image bytes: loading them would cost one request per card (8 a page,
 * towards the rate limit) and show nothing, so the placeholder is used instead (docs/HANDOFF.md, gap 6).
 * @param {string} src
 * @returns {string | null}
 */
function imageUrl(src) {
  return /^https?:\/\//i.test(src) ? src : null;
}

/**
 * "warranty" -> "Warranty", "battery_life" -> "Battery life".
 * @param {string} key
 * @returns {string}
 */
function specLabel(key) {
  const words = String(key).replace(/[_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The specification rows worth showing: null, undefined and empty values are left out (never "null").
 * @param {any} specs an object such as { warranty: "1 year", weight: null }
 * @returns {{ label: string, value: string }[]}
 */
export function toAppSpecs(specs) {
  if (!specs || typeof specs !== 'object' || Array.isArray(specs)) return [];
  return Object.entries(specs)
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(([key, value]) => ({ label: specLabel(key), value: String(value) }));
}

/**
 * A price from the TechSphere API in integer cents: 32999 -> 3299900, "EGP 33,999" -> 3399900.
 * @param {number | string} price
 * @returns {number}
 */
export function priceToCents(price) {
  const digits = String(price ?? '').replace(/[^\d.]/g, '');
  const pounds = typeof price === 'number' ? price : digits ? Number(digits) : NaN;
  return Number.isFinite(pounds) ? Math.round(pounds * 100) : NaN;
}

/**
 * A TechSphere product in the app's product shape. A product without a loadable image (none, empty, not
 * text, or a path to the API's placeholder endpoint) gets our placeholder; an image URL that fails to load
 * in the browser falls back to it too (utils/dom.js).
 * @param {any} p
 * @returns {object}
 */
export function toAppProduct(p) {
  const status = p.stock_status in STOCK_FOR_STATUS ? p.stock_status : 'in_stock';
  const name = String(p.name ?? 'Unnamed product');
  const sources = Array.isArray(p.images)
    ? p.images.filter((src) => typeof src === 'string' && src.trim())
    : [];
  const images = sources
    .map((src) => imageUrl(src.trim()))
    .filter(Boolean)
    .map((url) => ({ url, alt: name }));
  if (!images.length) images.push({ url: PLACEHOLDER, alt: name });
  return {
    id: p.id,
    name,
    category: p.category,
    brand: p.brand,
    price: priceToCents(p.price),
    compareAtPrice: null,
    currency: p.currency || 'EGP',
    rating: Number(p.rating) || 0,
    reviewCount: Number(p.reviews_count) || 0,
    stock: STOCK_FOR_STATUS[status],
    image: images[0],
    description: p.brand ? `${name} by ${p.brand}.` : `${name}.`,
    images,
    specs: toAppSpecs(p.specs),
  };
}

/**
 * GET /account/orders pages by offset in the TechSphere API; the app asks by page.
 * @param {string} search e.g. "limit=5&page=2"
 * @returns {string} e.g. "/account/orders?limit=5&offset=5"
 */
function toTechsphereOrdersQuery(search) {
  const from = new URLSearchParams(search);
  const limit = Math.max(1, Number(from.get('limit')) || 5);
  const page = Math.max(1, Number(from.get('page')) || 1);
  return `/account/orders?${new URLSearchParams({ limit: String(limit), offset: String((page - 1) * limit) })}`;
}

/**
 * Only the documented fields of a request body (PUT /account/addresses/{id} takes city and street).
 * @param {string} method
 * @param {string} path
 * @param {any} body
 * @returns {any}
 */
export function toTechsphereBody(method, path, body) {
  if (method === 'PUT' && /^\/account\/addresses\/[^/]+$/.test(path) && body) {
    const { city, street } = body;
    return street === undefined ? { city } : { city, street };
  }
  return body;
}

/**
 * A TechSphere order in the app's order shape. `total` is in pounds (a number); `created_at` comes in
 * several date formats and is kept as text (src/utils/dates.js reads it).
 * @param {any} o
 * @returns {object}
 */
export function toAppOrder(o) {
  const items = Array.isArray(o.items) ? o.items : [];
  return {
    id: o.id,
    createdAt: String(o.created_at ?? ''),
    status: o.status,
    items: items.map((i) => ({ productId: i.productId, name: null, quantity: Number(i.qty) || 1 })),
    total: priceToCents(o.total),
    currency: 'EGP',
    cancellable: o.status === 'processing',
  };
}

/**
 * The query of GET /products in TechSphere names. Other paths are returned unchanged.
 * @param {string} path e.g. "/products?limit=6&minPrice=1000&q=nova&sort=rating_desc"
 * @returns {string}
 */
export function toTechsphereRequest(path) {
  const [base, search = ''] = path.split('?');
  if (base === '/account/orders') return toTechsphereOrdersQuery(search);
  if (base !== '/products') return path;
  const from = new URLSearchParams(search);
  const to = new URLSearchParams();
  const copy = (name, value) => {
    if (value !== null && value !== undefined && value !== '') to.set(name, String(value));
  };
  for (const key of ['brand', 'category', 'page']) copy(key, from.get(key));
  copy('search', from.get('q'));
  if (from.get('minPrice')) copy('min_price', Math.floor(Number(from.get('minPrice')) / 100));
  if (from.get('maxPrice')) copy('max_price', Math.ceil(Number(from.get('maxPrice')) / 100));
  copy('min_rating', from.get('minRating'));
  const sort = { price_asc: 'price_asc', price_desc: 'price_desc', rating_desc: 'rating' }[
    from.get('sort')
  ];
  copy('sort', sort);
  const text = [...to.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return text.length ? `${base}?${new URLSearchParams(text)}` : base;
}

/**
 * A TechSphere response body in the app's format (catalog and product endpoints).
 * Pagination: GET /products pages by `page` (8 a page, `total_pages`); GET /account/orders by `offset` and
 * `limit`. Both become the app's { page, limit, total, totalPages }.
 * @param {string} path the request path (without the base URL)
 * @param {any} body
 * @returns {any}
 */
export function fromTechsphere(path, body) {
  const base = path.split('?')[0];
  if (base === '/products' && body && Array.isArray(body.items)) {
    const total = Number(body.total) || 0;
    return {
      data: body.items.map((p) => toAppProduct(p)),
      meta: {
        page: Math.max(1, Number(body.page) || 1),
        // The page size, not the number of items on this page: on a short last page (4 of 8) the
        // "Showing 17–20" count must still start at (page - 1) * 8 + 1.
        limit: TECHSPHERE_PAGE_SIZE,
        total,
        totalPages: Math.max(
          1,
          Number(body.total_pages) || Math.ceil(total / TECHSPHERE_PAGE_SIZE),
        ),
      },
    };
  }
  if (/^\/products\/[^/]+$/.test(base) && body && body.id) return { data: toAppProduct(body) };
  if (base === '/account/orders' && body && Array.isArray(body.items)) {
    const limit = body.limit || 5;
    return {
      data: body.items.map(toAppOrder),
      meta: {
        page: Math.floor((body.offset || 0) / limit) + 1,
        limit,
        total: body.total,
        totalPages: Math.max(1, Math.ceil(body.total / limit)),
      },
    };
  }
  if (/^\/account\/orders\/[^/]+\/cancel$/.test(base) && body && body.id)
    return { data: toAppOrder(body) };
  if (base === '/account/addresses' && Array.isArray(body)) return { data: body };
  if (/^\/account\/addresses\/[^/]+$/.test(base) && body && body.id) return { data: body };
  return body;
}

/** Error codes the app knows, by status (the TechSphere API sends only { error: "text" }). */
const CODE_FOR_STATUS = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'ORDER_NOT_CANCELLABLE',
  429: 'RATE_LIMITED',
};

/**
 * A TechSphere error body ({ error: "text" }) in the app's format ({ error: { code, message, details } }).
 * @param {number} status
 * @param {string} path
 * @param {any} body
 * @returns {any}
 */
export function toAppError(status, path, body) {
  if (!body || typeof body.error !== 'string') return body;
  const code =
    status === 401 && path.startsWith('/auth/login')
      ? 'INVALID_CREDENTIALS'
      : status === 400 && /already registered/i.test(body.error)
        ? 'EMAIL_TAKEN'
        : CODE_FOR_STATUS[status] || `HTTP_${status}`;
  return { error: { code, message: body.error, details: [] } };
}
