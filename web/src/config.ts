/**
 * Where the TechSphere API is: VITE_API_BASE, set per environment (grading, CI, the deployed builds; see
 * web/.env.example). When it is not set, the build configuration's development default is used: the API kit's
 * local server (web/vite.config.ts). No address is written in application code.
 */
function apiBase(): string {
  const base = import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_API_DEV_DEFAULT;
  if (!base) throw new Error('VITE_API_BASE is not set (see web/.env.example)');
  return base.replace(/\/+$/, '');
}

export const API_BASE: string = apiBase();

/** Products per page on GET /products (fixed by the API; it has no `limit` parameter). */
export const PRODUCTS_PAGE_SIZE = 8;

/** Orders per page on GET /account/orders (the API's default `limit`). */
export const ORDERS_PAGE_SIZE = 5;

/** Where the cart and the session are kept: the same keys and shapes as the legacy pages, so both share them. */
export const STORAGE_KEYS = {
  cart: 'brandstore:cart:v1',
  session: 'brandstore:session:v1',
} as const;
