/**
 * The other direction of the check in observed.ts: the types must not be looser than the API. Each
 * `@ts-expect-error` line is something the API never sends; if a type stopped rejecting it, the
 * directive itself would fail `npm run typecheck`.
 */
import type {
  ApiOrder,
  ApiProduct,
  ApiUser,
  OrderPage,
  PlaceOrderRequest,
  ProductPage,
  Session,
} from '../api';
import type { Cart, Order, Product, User } from '../domain';

declare const product: ApiProduct;

// A product always has images and specs, and its price is a number or a string, never null.
// @ts-expect-error images is required
export const noImages: ApiProduct = { ...product, images: undefined };
// @ts-expect-error price is never null
export const nullPrice: ApiProduct = { ...product, price: null };
// @ts-expect-error only three stock statuses exist
export const otherStock: ApiProduct = { ...product, stock_status: 'unknown' };
// @ts-expect-error categories are a closed set
export const otherCategory: ApiProduct = { ...product, category: 'tablets' };

// Products page by `page`; orders by `offset`: the two envelopes are not interchangeable.
export const mixedProducts: ProductPage = {
  items: [],
  page: 1,
  total_pages: 1,
  total: 0,
  // @ts-expect-error a product page has no offset
  offset: 0,
};
// @ts-expect-error an order page has no page number
export const mixedOrders: OrderPage = { items: [], offset: 0, limit: 5, total: 0, page: 1 };

// Order totals are numbers (pounds) and statuses are a closed set.
declare const order: ApiOrder;
// @ts-expect-error totals are never formatted strings
export const stringTotal: ApiOrder = { ...order, total: 'EGP 2,499' };
// @ts-expect-error unknown status
export const otherStatus: ApiOrder = { ...order, status: 'returned' };

// The user's role is optional (register omits it) but cannot be anything else.
// @ts-expect-error roles are shopper or admin
export const otherRole: ApiUser = { email: 'a@b.c', name: 'A', role: 'owner' };
// @ts-expect-error a session needs a token
export const noToken: Session = { user: { email: 'a@b.c', name: 'A' } };

// POST /orders needs at least one item (the server answers 400 otherwise).
// @ts-expect-error an empty order cannot be typed
export const emptyOrder: PlaceOrderRequest = { items: [] };

// Domain types: money is cents (numbers), a user always has a role, a product at least one image.
declare const domainProduct: Product;
// @ts-expect-error a domain product always has an image
export const noDomainImages: Product = { ...domainProduct, images: [] };
// @ts-expect-error the mapper fills in role
export const noRole: User = { email: 'a@b.c', name: 'A' };
export const stringPrice: Cart = {
  items: [
    {
      productId: 'p',
      name: 'P',
      // @ts-expect-error no string prices once mapped
      unitPrice: '1.00',
      currency: 'EGP',
      quantity: 1,
      stock: 1,
      image: { url: '', alt: '' },
    },
  ],
};
declare const domainOrder: Order;
export const parsedDate: Date | null = domainOrder.createdAt;
