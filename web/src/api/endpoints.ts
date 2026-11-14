/** The API calls the React app makes, typed end to end (wire type in, domain type out). */
import type {
  AdminSummary,
  ApiAddress,
  ApiCategory,
  ApiOrder,
  ApiProduct,
  OrderPage,
  PlacedOrder,
  PlaceOrderRequest,
  ProductPage,
  ProductQuery,
  Session,
} from '@shared/api';
import type { Address, AuthSession, Order, Paged, Product } from '@shared/domain';
import { ORDERS_PAGE_SIZE } from '../config';
import { request } from './client';
import { sessionFromToken } from '../features/auth/session';
import { toAddress, toOrder, toOrderPage, toProduct, toProductPage, toUser } from './mappers';

export function fetchCategories(signal?: AbortSignal): Promise<ApiCategory[]> {
  return request<ApiCategory[]>('/categories', { signal });
}

export async function fetchProducts(
  query: ProductQuery,
  signal?: AbortSignal,
): Promise<Paged<Product>> {
  const { category, brand, search, min_price, max_price, min_rating, sort, page, locale } = query;
  const page_ = await request<ProductPage>('/products', {
    query: { category, brand, search, min_price, max_price, min_rating, sort, page, locale },
    signal,
  });
  return toProductPage(page_);
}

export async function fetchProduct(id: string, signal?: AbortSignal): Promise<Product> {
  return toProduct(await request<ApiProduct>(`/products/${encodeURIComponent(id)}`, { signal }));
}

/** POST /auth/login: credentials only in the JSON body, never in the URL. */
export async function login(email: string, password: string): Promise<AuthSession> {
  const session = await request<Session>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  return sessionFromToken(session.token, toUser(session.user));
}

export async function fetchOrders(page: number, signal?: AbortSignal): Promise<Paged<Order>> {
  const offset = (Math.max(1, page) - 1) * ORDERS_PAGE_SIZE;
  return toOrderPage(
    await request<OrderPage>('/account/orders', {
      query: { offset, limit: ORDERS_PAGE_SIZE },
      auth: true,
      signal,
    }),
  );
}

/**
 * The body the checkout sends to POST /orders. The API requires only `items`; the rest is what a real backend
 * needs and the TechSphere mock accepts and ignores. `idempotencyKey` is in the body, not an
 * `Idempotency-Key` header, because the API's CORS allows only the Authorization and Content-Type headers
 * (a custom header would fail the browser's preflight).
 */
export interface CheckoutOrderRequest extends PlaceOrderRequest {
  idempotencyKey: string;
  shipping: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    governorate: string;
    postalCode?: string;
  };
  payment: { method: 'card' | 'cod' | 'wallet'; reference: string };
}

/** POST /orders: 201 { id, number, status }. */
export function placeOrder(body: CheckoutOrderRequest): Promise<PlacedOrder> {
  return request<PlacedOrder>('/orders', { method: 'POST', body, auth: true });
}

/** PATCH /account/orders/:id/cancel: 200 with the cancelled order; 409 when it has shipped already. */
export async function cancelOrder(id: string): Promise<Order> {
  return toOrder(
    await request<ApiOrder>(`/account/orders/${encodeURIComponent(id)}/cancel`, {
      method: 'PATCH',
      auth: true,
    }),
  );
}

export async function fetchAddresses(signal?: AbortSignal): Promise<Address[]> {
  return (await request<ApiAddress[]>('/account/addresses', { auth: true, signal })).map(toAddress);
}

/** POST /auth/register: 201 { token, user } (signed in); 400 "Email already registered" or invalid input. */
export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthSession> {
  const session = await request<Session>('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  });
  return sessionFromToken(session.token, session.user);
}

/** GET /admin/summary (admin accounts only), in the app's names. */
export interface AdminTotals {
  revenue: number;
  orders: number;
  products: number;
  outOfStock: number;
  currency: string;
  note: string;
}

export async function fetchAdminSummary(signal?: AbortSignal): Promise<AdminTotals> {
  const raw = await request<AdminSummary>('/admin/summary', { auth: true, signal });
  return {
    revenue: raw.revenue,
    orders: raw.orders,
    products: raw.products,
    outOfStock: raw.out_of_stock,
    currency: raw.currency,
    note: raw.note,
  };
}
