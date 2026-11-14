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

/** A JWT-shaped token (alg none, like the kit's) that expires in an hour. */
export function freshToken(email: string, now = Date.now()): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '');
  return `${encode({ alg: 'none' })}.${encode({ sub: email, exp: Math.floor(now / 1000) + 3600 })}.test`;
}

export const SHOPPER = { email: 'student@techsphere.test', password: 'Passw0rd!' };
