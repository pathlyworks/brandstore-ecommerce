/**
 * Where the TechSphere API is: VITE_API_BASE (given when the app is graded), else the API kit's server on
 * http://localhost:4010 (`python api/techsphere/server.py`).
 */
export const API_BASE: string = (import.meta.env.VITE_API_BASE ?? 'http://localhost:4010').replace(
  /\/+$/,
  '',
);

/** Products per page on GET /products (fixed by the API; it has no `limit` parameter). */
export const PRODUCTS_PAGE_SIZE = 8;

/** Orders per page on GET /account/orders (the API's default `limit`). */
export const ORDERS_PAGE_SIZE = 5;

/** Where the cart and the session are kept: the same keys and shapes as the legacy pages, so both share them. */
export const STORAGE_KEYS = {
  cart: 'brandstore:cart:v1',
  session: 'brandstore:session:v1',
} as const;
