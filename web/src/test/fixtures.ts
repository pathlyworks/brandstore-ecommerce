/**
 * Fixtures for the tests: the TechSphere responses captured in docs/migration/observed (Advanced Task 1), so
 * the React app is tested against what the API really sends (prices as strings, missing stock_status, …).
 */
import type { ApiCategory, ApiProduct, OrderPage, ProductPage, Session } from '@shared/api';
import categoriesFile from '@observed/categories.json';
import page1 from '@observed/products-page-1.json';
import page2 from '@observed/products-page-2.json';
import page3 from '@observed/products-page-3.json';
import loginFile from '@observed/login-shopper.json';
import ordersPage1 from '@observed/orders-page-1.json';
import ordersOffset5 from '@observed/orders-offset-5.json';

interface Captured {
  body: unknown;
}
const body = <T>(file: Captured): T => file.body as T;

export const categories = body<ApiCategory[]>(categoriesFile);
export const products: ApiProduct[] = [page1, page2, page3].flatMap(
  (file) => body<ProductPage>(file).items,
);
export const session = body<Session>(loginFile);
export const orders = [
  ...body<OrderPage>(ordersPage1).items,
  ...body<OrderPage>(ordersOffset5).items,
];

/** A JWT-shaped token like the kit's (alg none; { sub, role, exp }), valid for `ttlSeconds` (an hour). */
export function freshToken(
  email: string,
  now = Date.now(),
  role: 'shopper' | 'admin' = 'shopper',
  ttlSeconds = 3600,
): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return `${encode({ alg: 'none' })}.${encode({ sub: email, role, exp })}.test`;
}

export const SHOPPER = { email: 'student@techsphere.test', password: 'Passw0rd!' };
export const ADMIN = { email: 'admin@techsphere.test', password: 'Admin123!' };
