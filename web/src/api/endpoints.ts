/** The API calls the React app makes, typed end to end (wire type in, domain type out). */
import type {
  ApiCategory,
  ApiProduct,
  OrderPage,
  ProductPage,
  ProductQuery,
  Session,
} from '@shared/api';
import type { AuthSession, Order, Paged, Product } from '@shared/domain';
import { ORDERS_PAGE_SIZE } from '../config';
import { request } from './client';
import { toOrderPage, toProduct, toProductPage, toUser } from './mappers';

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
  return {
    token: session.token,
    expiresAt: tokenExpiry(session.token),
    user: toUser(session.user),
  };
}

export async function fetchOrders(
  page: number,
  token: string,
  signal?: AbortSignal,
): Promise<Paged<Order>> {
  const offset = (Math.max(1, page) - 1) * ORDERS_PAGE_SIZE;
  return toOrderPage(
    await request<OrderPage>('/account/orders', {
      query: { offset, limit: ORDERS_PAGE_SIZE },
      token,
      signal,
    }),
  );
}

/** The token's `exp` (seconds) in milliseconds; an unreadable token expires in an hour (the API's lifetime). */
export function tokenExpiry(token: string, now = Date.now()): number {
  try {
    const part = token.split('.')[1] ?? '';
    const json = atob(
      part
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(part.length / 4) * 4, '='),
    );
    const exp = (JSON.parse(json) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : now + 3_600_000;
  } catch {
    return now + 3_600_000;
  }
}
