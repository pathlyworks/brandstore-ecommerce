/**
 * src/types/api.ts — the TechSphere API exactly as it answers (the "wire" format), written from the
 * responses captured by scripts/capture-api.mjs (docs/migration/observed/) and the field inventory in
 * docs/migration/observed-fields.md. A field present in every captured record is required; one that is
 * sometimes missing is optional; a field seen with two JSON types is a union. Where the spec
 * (api/techsphere/openapi.yaml) and the server disagree, these types follow the server and say so.
 *
 * Checked by `npm run typecheck`: src/types/__checks__/observed.ts assigns every captured body to its type,
 * so a missing field, an extra field or a wrong type is a compile error.
 * The app does not use these types directly: src/types/domain.ts is what components see, and the
 * mappers in api/techsphere.js (to be ported to TypeScript in wave 1) turn one into the other.
 */

/** ISO 4217 currency. Only "EGP" has been observed. */
export type Currency = 'EGP';

/** Category slugs (GET /categories `id`, product `category`). */
export type CategorySlug = 'laptops' | 'phones' | 'audio' | 'smart-home';

/** Product stock. Missing on 2 of 24 products (p-007, p-018). */
export type StockStatus = 'in_stock' | 'low' | 'out_of_stock';

/**
 * A price in whole pounds. Usually a number (32999), but some products send a formatted string
 * ("EGP 13,999", p-005 and p-014). Both are observed, so both are allowed. Never use it for arithmetic before
 * converting to integer cents (domain.ts `Cents`).
 */
export type ApiPrice = number | string;

/** Order status. All four are observed in GET /account/orders. */
export type OrderStatus = 'processing' | 'shipped' | 'delivered' | 'cancelled';

/** Account role. Login answers include it; register answers do not. */
export type Role = 'shopper' | 'admin';

/** Languages for `?locale=` (names change, ids do not). */
export type Locale = 'en' | 'ar';

// ---- Catalog ---------------------------------------------------------------------------------------

/** GET /categories item. */
export interface ApiCategory {
  id: CategorySlug;
  name: string;
}

/** A product as GET /products and GET /products/{id} send it. */
export interface ApiProduct {
  id: string;
  name: string;
  brand: string;
  category: CategorySlug;
  price: ApiPrice;
  currency: Currency;
  stock_status?: StockStatus;
  rating: number;
  reviews_count: number;
  /** Root-relative paths ("/images/p-001.webp"). The /images endpoint answers JSON, not image bytes. */
  images: string[];
  /** Free-form; only `warranty` has been observed. Values have always been strings. */
  specs: Record<string, string>;
}

/** GET /products: pages by `page`, always 8 items a page (no `limit` parameter). */
export interface ProductPage {
  items: ApiProduct[];
  page: number;
  total_pages: number;
  total: number;
}

/** Sort values GET /products accepts (anything else is a 400). */
export type ProductSort = 'price_asc' | 'price_desc' | 'rating';

/** GET /products query (prices in whole pounds). */
export interface ProductQuery {
  category?: CategorySlug;
  brand?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  min_rating?: number;
  sort?: ProductSort;
  page?: number;
  locale?: Locale;
}

/** GET /images/{file}: the mock's placeholder body (200), and also the body of its 404. */
export interface ImageStub {
  image: string;
}

// ---- Auth --------------------------------------------------------------------------------------------

/** The user inside a session. `role` is missing in POST /auth/register answers. */
export interface ApiUser {
  email: string;
  name: string;
  role?: Role;
}

/** POST /auth/login 200 and POST /auth/register 201. The token is an unsigned JWT (alg "none"), 1 hour. */
export interface Session {
  token: string;
  user: ApiUser;
}

/** The token's payload (base64url middle part). */
export interface TokenPayload {
  sub: string;
  role: Role;
  /** Seconds since the epoch. */
  exp: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  name?: string;
}

// ---- Account -------------------------------------------------------------------------------------------

export interface ApiOrderLine {
  productId: string;
  qty: number;
}

/** GET /account/orders item. `total` is a number in pounds; `created_at` comes in four formats. */
export interface ApiOrder {
  id: string;
  items: ApiOrderLine[];
  total: number;
  status: OrderStatus;
  /** "2026-08-01T10:15:00Z", "02/08/2026", "2026-08-03T18:40:00+03:00" or "4 Aug 2026". */
  created_at: string;
}

/** GET /account/orders: pages by `offset` and `limit` (default 5), unlike GET /products. */
export interface OrderPage {
  items: ApiOrder[];
  offset: number;
  limit: number;
  total: number;
}

export interface OrderQuery {
  offset?: number;
  limit?: number;
}

/** GET /account/addresses item. There is no POST: addresses can only be updated and deleted. */
export interface ApiAddress {
  id: string;
  city: string;
  street: string;
}

/** PUT /account/addresses/{id} body. `city` is required (400 without it). */
export interface AddressUpdate {
  city: string;
  street?: string;
}

// ---- Orders and admin ------------------------------------------------------------------------------------

/** POST /orders body. The server needs at least one item but checks nothing else. */
export interface PlaceOrderRequest {
  items: [ApiOrderLine, ...ApiOrderLine[]];
}

/** POST /orders 201. No lines, prices or total come back. */
export interface PlacedOrder {
  id: string;
  number: string;
  status: OrderStatus;
}

/** GET /admin/summary (admin token; 403 for a shopper). Revenue is in whole pounds. */
export interface AdminSummary {
  revenue: number;
  orders: number;
  products: number;
  out_of_stock: number;
  currency: Currency;
  note: string;
}

// ---- Errors ------------------------------------------------------------------------------------------------

/**
 * Every 4xx body: one English message, no code, no field details. `status` appears only on failures forced
 * through the kit's /__control (seen on the 429). 429 has no Retry-After header.
 */
export interface ApiError {
  error: string;
  status?: number;
}

/** Status codes the API was observed to send, per endpoint (docs/migration/observed/index.json). */
export type ObservedStatus = 200 | 201 | 204 | 400 | 401 | 403 | 404 | 405 | 409 | 429;

// ---- The endpoint map (for the typed client in wave 1) -------------------------------------------------

/** "METHOD /path" -> request and response types. Path parameters are written as {id}. */
export interface Endpoints {
  'GET /categories': { query: { locale?: Locale }; body: never; response: ApiCategory[] };
  'GET /products': { query: ProductQuery; body: never; response: ProductPage };
  'GET /products/{id}': { query: { locale?: Locale }; body: never; response: ApiProduct };
  'POST /auth/login': { query: never; body: LoginRequest; response: Session };
  'POST /auth/register': { query: never; body: RegisterRequest; response: Session };
  'GET /account/orders': { query: OrderQuery; body: never; response: OrderPage };
  'PATCH /account/orders/{id}/cancel': { query: never; body: never; response: ApiOrder };
  'GET /account/addresses': { query: never; body: never; response: ApiAddress[] };
  'PUT /account/addresses/{id}': { query: never; body: AddressUpdate; response: ApiAddress };
  'DELETE /account/addresses/{id}': { query: never; body: never; response: null };
  'POST /orders': { query: never; body: PlaceOrderRequest; response: PlacedOrder };
  'GET /admin/summary': { query: never; body: never; response: AdminSummary };
}
