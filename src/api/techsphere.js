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

/** The TechSphere API has no product images to show (its /images answer is a placeholder), so use ours. */
const PLACEHOLDER = '/assets/product-placeholder.svg';

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
 * A TechSphere product in the app's product shape.
 * @param {any} p
 * @returns {object}
 */
export function toAppProduct(p) {
  const status = p.stock_status in STOCK_FOR_STATUS ? p.stock_status : 'in_stock';
  const specs = p.specs && typeof p.specs === 'object' ? Object.entries(p.specs) : [];
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    brand: p.brand,
    price: priceToCents(p.price),
    compareAtPrice: null,
    currency: p.currency || 'EGP',
    rating: Number(p.rating) || 0,
    reviewCount: Number(p.reviews_count) || 0,
    stock: STOCK_FOR_STATUS[status],
    image: { url: PLACEHOLDER, alt: p.name },
    description: `${p.name} by ${p.brand}.`,
    images: [{ url: PLACEHOLDER, alt: p.name }],
    specs: specs.map(([label, value]) => ({ label, value: String(value) })),
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
 * @param {string} path the request path (without the base URL)
 * @param {any} body
 * @returns {any}
 */
export function fromTechsphere(path, body) {
  const base = path.split('?')[0];
  if (base === '/products' && body && Array.isArray(body.items)) {
    return {
      data: body.items.map(toAppProduct),
      meta: {
        page: body.page,
        limit: body.items.length || 8,
        total: body.total,
        totalPages: Math.max(1, body.total_pages),
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
