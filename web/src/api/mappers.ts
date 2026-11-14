/**
 * TechSphere wire types (src/types/api.ts) to the domain types the components use (src/types/domain.ts).
 * Ported from the legacy api/techsphere.js; the same rules, now checked by the compiler.
 */
import type {
  ApiAddress,
  ApiOrder,
  ApiProduct,
  ApiUser,
  OrderPage,
  ProductPage,
  StockStatus,
} from '@shared/api';
import type {
  Address,
  Order,
  Paged,
  Product,
  ProductImage,
  Spec,
  Stock,
  User,
} from '@shared/domain';
import { ORDERS_PAGE_SIZE, PRODUCTS_PAGE_SIZE } from '../config';
import { parseOrderDate } from '../lib/dates';
import { priceToCents } from '../lib/money';

export const PLACEHOLDER_IMAGE = '/product-placeholder.svg';

/** The cart limits per stock status (the API sends no quantity; docs/HANDOFF.md gap 2). */
const AVAILABLE: Record<StockStatus, number> = { in_stock: 25, low: 3, out_of_stock: 0 };

export function toStock(status: StockStatus | undefined): Stock {
  return status
    ? { status, available: AVAILABLE[status] }
    : { status: 'unknown', available: AVAILABLE.in_stock };
}

function toImages(p: ApiProduct): [ProductImage, ...ProductImage[]] {
  // Root-relative paths point at the API's /images endpoint, which answers JSON, not image bytes.
  const urls = p.images.filter((src) => /^https?:\/\//i.test(src));
  const [first, ...rest] = urls.map((url) => ({ url, alt: p.name }));
  return first ? [first, ...rest] : [{ url: PLACEHOLDER_IMAGE, alt: p.name }];
}

function toSpecs(specs: ApiProduct['specs']): Spec[] {
  return Object.entries(specs)
    .filter(([, value]) => value.trim() !== '')
    .map(([key, value]) => {
      const words = key.replace(/[_-]+/g, ' ').trim();
      return { label: words.charAt(0).toUpperCase() + words.slice(1), value };
    });
}

export function toProduct(p: ApiProduct): Product {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: priceToCents(p.price),
    currency: p.currency,
    stock: toStock(p.stock_status),
    rating: p.rating,
    reviewCount: p.reviews_count,
    images: toImages(p),
    specs: toSpecs(p.specs),
  };
}

export function toProductPage(page: ProductPage): Paged<Product> {
  return {
    items: page.items.map(toProduct),
    page: page.page,
    pageSize: PRODUCTS_PAGE_SIZE,
    total: page.total,
    totalPages: Math.max(1, page.total_pages),
  };
}

export function toOrder(o: ApiOrder): Order {
  return {
    id: o.id,
    status: o.status,
    createdAt: parseOrderDate(o.created_at),
    createdAtText: o.created_at,
    lines: o.items.map((line) => ({ productId: line.productId, quantity: line.qty })),
    total: Math.round(o.total * 100),
    currency: 'EGP',
    cancellable: o.status === 'processing',
  };
}

export function toOrderPage(page: OrderPage): Paged<Order> {
  const pageSize = page.limit || ORDERS_PAGE_SIZE;
  return {
    items: page.items.map(toOrder),
    page: Math.floor(page.offset / pageSize) + 1,
    pageSize,
    total: page.total,
    totalPages: Math.max(1, Math.ceil(page.total / pageSize)),
  };
}

export function toUser(u: ApiUser): User {
  return { email: u.email, name: u.name, role: u.role ?? 'shopper' };
}

export function toAddress(a: ApiAddress): Address {
  return { id: a.id, city: a.city, street: a.street };
}
