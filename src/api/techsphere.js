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
 * The query of GET /products in TechSphere names. Other paths are returned unchanged.
 * @param {string} path e.g. "/products?limit=6&minPrice=1000&q=nova&sort=rating_desc"
 * @returns {string}
 */
export function toTechsphereRequest(path) {
  const [base, search = ''] = path.split('?');
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
      : CODE_FOR_STATUS[status] || `HTTP_${status}`;
  return { error: { code, message: body.error, details: [] } };
}
