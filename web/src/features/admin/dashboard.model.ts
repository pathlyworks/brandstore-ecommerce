/**
 * The admin dashboard's numbers, as pure functions of what the API returned (no React, fully unit-tested
 * against the API kit's fixtures in dashboard.model.test.ts).
 *
 * Definitions (task_5_dashboard_performance.md §2):
 * - Sales = GET /admin/summary `revenue`: the gross value of orders that are not cancelled. It is sales, not
 *   what the store earns after costs, and the dashboard never labels it otherwise.
 * - Orders = the summary's `orders` (every order, cancelled ones included).
 * - Average order value = sales ÷ orders that count toward sales (not cancelled). Dividing by every order
 *   would mix cancelled orders, which add nothing to sales, into the average.
 * - Category and month figures are not in the summary, so they are computed from the orders
 *   (GET /account/orders, which in this API returns the store's orders to an admin token) and the catalog
 *   (GET /products): each order's total is split over its lines by line value (price × quantity). The
 *   dashboard checks that these add up to the summary's sales and says so when they do not.
 */
import type { CategorySlug } from '@shared/api';
import type { Cents, Order, Product } from '@shared/domain';

export interface SummaryTotals {
  /** Whole pounds, as GET /admin/summary sends it. */
  revenue: number;
  orders: number;
  products: number;
  outOfStock: number;
  currency: string;
}

export interface Kpis {
  sales: Cents;
  orders: number;
  countedOrders: number;
  cancelledOrders: number;
  /** null when no order counts toward sales (no division by zero). */
  averageOrderValue: Cents | null;
  currency: string;
}

export interface CategoryRow {
  id: CategorySlug | 'unknown';
  name: string;
  products: number;
  outOfStock: number;
  /** Orders with at least one line in this category (not cancelled). */
  orders: number;
  units: number;
  sales: Cents;
  /** Share of all sales, 0..1. */
  share: number;
}

export interface MonthPoint {
  /** "2026-08" */
  key: string;
  /** "Aug 2026" */
  label: string;
  orders: number;
  sales: Cents;
}

export interface Reconciliation {
  /** Sales computed from the orders, in cents. */
  fromOrders: Cents;
  /** Summary sales minus computed sales (0 when they agree). */
  difference: Cents;
  ordersListed: number;
  /** Orders whose date could not be read: counted in sales and categories, left out of the months. */
  undated: number;
}

export interface Dashboard {
  kpis: Kpis;
  categories: CategoryRow[];
  months: MonthPoint[];
  reconciliation: Reconciliation;
}

const counts = (order: Order) => order.status !== 'cancelled';

export function computeKpis(summary: SummaryTotals, orders: readonly Order[]): Kpis {
  const sales = Math.round(summary.revenue * 100);
  const countedOrders = orders.filter(counts).length;
  return {
    sales,
    orders: summary.orders,
    countedOrders,
    cancelledOrders: orders.length - countedOrders,
    averageOrderValue: countedOrders > 0 ? Math.round(sales / countedOrders) : null,
    currency: summary.currency,
  };
}

/**
 * Splits an order's total over its lines by line value; a line whose product is not in the catalog gets
 * an equal share of what the known lines leave (here: everything, when no line is known).
 */
export function splitOrder(
  order: Order,
  priceOf: (productId: string) => Cents | undefined,
): { productId: string; quantity: number; sales: Cents }[] {
  const weights = order.lines.map((line) => (priceOf(line.productId) ?? 0) * line.quantity);
  const sum = weights.reduce((a, b) => a + b, 0);
  let left = order.total;
  return order.lines.map((line, i) => {
    const last = i === order.lines.length - 1;
    const share =
      sum > 0
        ? Math.round((order.total * (weights[i] ?? 0)) / sum)
        : Math.round(order.total / order.lines.length);
    const sales = last ? left : share;
    left -= sales;
    return { productId: line.productId, quantity: line.quantity, sales };
  });
}

export function categoryRows(
  orders: readonly Order[],
  products: readonly Product[],
  names: ReadonlyMap<string, string>,
): CategoryRow[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  const rows = new Map<CategoryRow['id'], CategoryRow>();
  const row = (id: CategoryRow['id']): CategoryRow => {
    const existing = rows.get(id);
    if (existing) return existing;
    const created: CategoryRow = {
      id,
      name: id === 'unknown' ? 'Not in the catalog' : (names.get(id) ?? id),
      products: 0,
      outOfStock: 0,
      orders: 0,
      units: 0,
      sales: 0,
      share: 0,
    };
    rows.set(id, created);
    return created;
  };
  for (const [id] of names) row(id as CategorySlug);
  for (const p of products) {
    const r = row(p.category);
    r.products += 1;
    if (p.stock.status === 'out_of_stock') r.outOfStock += 1;
  }
  for (const order of orders.filter(counts)) {
    const touched = new Set<CategoryRow['id']>();
    for (const part of splitOrder(order, (id) => byId.get(id)?.price)) {
      const r = row(byId.get(part.productId)?.category ?? 'unknown');
      r.units += part.quantity;
      r.sales += part.sales;
      touched.add(r.id);
    }
    for (const id of touched) row(id).orders += 1;
  }
  const total = [...rows.values()].reduce((a, r) => a + r.sales, 0);
  return [...rows.values()].map((r) => ({ ...r, share: total > 0 ? r.sales / total : 0 }));
}

const MONTH = new Intl.DateTimeFormat('en-GB', {
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Sales per calendar month (UTC), from the first month with an order to the last, empty months included. */
export function monthlyTrend(orders: readonly Order[]): MonthPoint[] {
  const dated = orders
    .filter(counts)
    .filter((o): o is Order & { createdAt: Date } => o.createdAt !== null);
  if (dated.length === 0) return [];
  const index = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth();
  const first = Math.min(...dated.map((o) => index(o.createdAt)));
  const last = Math.max(...dated.map((o) => index(o.createdAt)));
  const points: MonthPoint[] = [];
  for (let m = first; m <= last; m += 1) {
    const date = new Date(Date.UTC(Math.floor(m / 12), m % 12, 1));
    const inMonth = dated.filter((o) => index(o.createdAt) === m);
    points.push({
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      label: MONTH.format(date),
      orders: inMonth.length,
      sales: inMonth.reduce((a, o) => a + o.total, 0),
    });
  }
  return points;
}

export function buildDashboard(
  summary: SummaryTotals,
  orders: readonly Order[],
  products: readonly Product[],
  categoryNames: ReadonlyMap<string, string>,
): Dashboard {
  const kpis = computeKpis(summary, orders);
  const fromOrders = orders.filter(counts).reduce((a, o) => a + o.total, 0);
  return {
    kpis,
    categories: categoryRows(orders, products, categoryNames),
    months: monthlyTrend(orders),
    reconciliation: {
      fromOrders,
      difference: kpis.sales - fromOrders,
      ordersListed: orders.length,
      undated: orders.filter((o) => counts(o) && o.createdAt === null).length,
    },
  };
}
