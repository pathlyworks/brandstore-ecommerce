/**
 * src/types/domain.ts — what the React components will work with: the six domain types the plan names
 * (Product, Cart, CartItem, Order, User, Address) and the values derived from them. They are the API's
 * shapes (src/types/api.ts) after the mapping the legacy app already does in api/techsphere.js and
 * state/cart.js: money in integer cents, one stock model, camelCase, dates parsed, no `| string` prices.
 * Each type notes the API field it comes from, so the mappers in wave 1 can be checked against it.
 */
import type { CategorySlug, Currency, OrderStatus, Role, StockStatus } from './api';

/** Money in integer minor units (piastres/cents): 32999 EGP is 3299900. Never a float. */
export type Cents = number;

/** An image the browser can load, with its alt text. A product with none gets the placeholder. */
export interface ProductImage {
  url: string;
  alt: string;
}

/** One row of the specifications table. Rows whose value is empty are dropped by the mapper. */
export interface Spec {
  label: string;
  value: string;
}

/**
 * Stock as the cart needs it. The API has only a status (sometimes missing); the legacy app assumes
 * in_stock 25, low 3, out_of_stock 0, and treats a missing status as in stock (docs/HANDOFF.md, gap 2).
 */
export interface Stock {
  status: StockStatus | 'unknown';
  /** How many the cart may hold (the assumption above, capped by MAX_PER_LINE = 10). */
  available: number;
}

/** A product (from ApiProduct). */
export interface Product {
  id: string;
  name: string;
  brand: string;
  category: CategorySlug;
  /** From `price`, number or "EGP 13,999", always converted. */
  price: Cents;
  currency: Currency;
  stock: Stock;
  rating: number;
  /** From `reviews_count`. */
  reviewCount: number;
  /** Never empty (the placeholder when the API gives nothing loadable). */
  images: [ProductImage, ...ProductImage[]];
  specs: Spec[];
}

/** A product as a list card needs it (the catalog, recently viewed, saved items). */
export type ProductSummary = Pick<
  Product,
  'id' | 'name' | 'brand' | 'category' | 'price' | 'currency' | 'stock' | 'rating' | 'reviewCount'
> & {
  image: ProductImage;
};

/** One cart line. Keeps a snapshot of name, price and image so the cart renders before the API answers. */
export interface CartItem {
  productId: string;
  name: string;
  unitPrice: Cents;
  currency: Currency;
  quantity: number;
  /** Last known availability; 0 means "out of stock: kept but not charged". */
  stock: number;
  image: ProductImage;
}

/** The cart (localStorage "brandstore:cart:v1" today; the key and shape stay the same in React). */
export interface Cart {
  items: CartItem[];
}

/** Derived, never stored: what the cart page and the header badge show. */
export interface CartTotals {
  itemCount: number;
  subtotal: Cents;
  shipping: Cents;
  total: Cents;
  freeShippingRemaining: Cents;
  currency: Currency;
}

/** Saved for later: the same line shape, a separate list. */
export type SavedItem = CartItem;

/** An order (from ApiOrder; PlacedOrder adds `number`). */
export interface Order {
  id: string;
  /** Only returned by POST /orders ("TS-1001"); orders from GET /account/orders have none. */
  number?: string;
  status: OrderStatus;
  /** Parsed from `created_at` (four formats); null when it cannot be read. */
  createdAt: Date | null;
  /** The text the API sent, for display when parsing fails. */
  createdAtText: string;
  lines: { productId: string; quantity: number }[];
  /** From `total` (whole pounds). */
  total: Cents;
  currency: Currency;
  /** Only "processing" orders can be cancelled (409 otherwise). */
  cancellable: boolean;
}

/** The signed-in user (from ApiUser; `role` defaults to "shopper" when the API leaves it out). */
export interface User {
  email: string;
  name: string;
  role: Role;
}

/** The session the app keeps (sessionStorage "brandstore:session:v1"). */
export interface AuthSession {
  token: string;
  /** Milliseconds since the epoch, from the token's `exp`. */
  expiresAt: number;
  user: User;
}

/** A saved address (from ApiAddress, unchanged). */
export interface Address {
  id: string;
  city: string;
  street: string;
}

/** Async data in components that do not use a server-state library (wave 1). */
export type Loadable<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: AppError };

/** The app's error, whatever the API sent (status 0 = network). */
export interface AppError {
  status: number;
  code:
    | 'VALIDATION_ERROR'
    | 'UNAUTHENTICATED'
    | 'INVALID_CREDENTIALS'
    | 'EMAIL_TAKEN'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'ORDER_NOT_CANCELLABLE'
    | 'RATE_LIMITED'
    | 'SERVER_ERROR'
    | 'NETWORK';
  message: string;
  retryAfter: number | null;
}

/** A page of anything, whichever way the API paged it (page for products, offset for orders). */
export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
