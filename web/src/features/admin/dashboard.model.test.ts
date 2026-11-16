/**
 * The dashboard's numbers against the API kit's fixtures (the captured TechSphere responses). The reference
 * values are computed here from the raw API JSON with the kit's own rule (server.py admin_summary:
 * revenue = sum of `total` over orders whose status is not "cancelled"), independently of the model.
 */
import { describe, expect, it } from 'vitest';
import type { Order } from '@shared/domain';
import { toOrder, toProduct } from '../../api/mappers';
import { categories, orders as apiOrders, products as apiProducts } from '../../test/fixtures';
import {
  buildDashboard,
  categoryRows,
  computeKpis,
  monthlyTrend,
  splitOrder,
  type SummaryTotals,
} from './dashboard.model';

const orders = apiOrders.map(toOrder);
const products = apiProducts.map(toProduct);
const names = new Map(categories.map((c) => [c.id, c.name]));

// Reference calculator: straight from the API JSON (whole pounds), as the grader's would.
const counted = apiOrders.filter((o) => o.status !== 'cancelled');
const REF_REVENUE = counted.reduce((sum, o) => sum + o.total, 0);
const summary: SummaryTotals = {
  revenue: REF_REVENUE,
  orders: apiOrders.length,
  products: apiProducts.length,
  outOfStock: apiProducts.filter((p) => p.stock_status === 'out_of_stock').length,
  currency: 'EGP',
};

describe('KPIs (fixtures: 9 orders, 2 cancelled)', () => {
  it('sales = the summary revenue, in cents; it matches the kit rule over the orders', () => {
    expect(REF_REVENUE).toBe(20_093);
    expect(computeKpis(summary, orders).sales).toBe(2_009_300);
  });

  it('counts orders and cancelled ones', () => {
    const k = computeKpis(summary, orders);
    expect(k.orders).toBe(9);
    expect(k.countedOrders).toBe(7);
    expect(k.cancelledOrders).toBe(2);
  });

  it('average order value = sales ÷ orders not cancelled (EGP 2,870.43), not ÷ all 9', () => {
    const k = computeKpis(summary, orders);
    expect(k.averageOrderValue).toBe(Math.round((REF_REVENUE * 100) / counted.length));
    expect(k.averageOrderValue).toBe(287_043);
    expect(k.averageOrderValue).not.toBe(Math.round((REF_REVENUE * 100) / 9));
  });

  it('no division by zero when every order is cancelled or there are none', () => {
    expect(computeKpis({ ...summary, revenue: 0, orders: 0 }, []).averageOrderValue).toBeNull();
    const cancelled = orders.map((o) => ({ ...o, status: 'cancelled' as const }));
    expect(computeKpis({ ...summary, revenue: 0 }, cancelled).averageOrderValue).toBeNull();
  });
});

describe('category table', () => {
  const rows = categoryRows(orders, products, names);
  const by = (id: string) => rows.find((r) => r.id === id);

  it('has every category, even one without sales', () => {
    expect(rows.map((r) => r.id).sort()).toEqual(['audio', 'laptops', 'phones', 'smart-home']);
    expect(by('smart-home')?.sales).toBe(0);
  });

  it('sales per category add up to the summary sales, and shares to 1', () => {
    expect(rows.reduce((a, r) => a + r.sales, 0)).toBe(REF_REVENUE * 100);
    expect(rows.reduce((a, r) => a + r.share, 0)).toBeCloseTo(1, 10);
  });

  it('matches a hand calculation: laptops = o-001 + o-005 + o-009', () => {
    const laptops = counted
      .filter((o) =>
        o.items.some((i) => apiProducts.find((p) => p.id === i.productId)?.category === 'laptops'),
      )
      .reduce((a, o) => a + o.total, 0);
    expect(laptops).toBe(2_499 + 2_899 + 3_299);
    expect(by('laptops')?.sales).toBe(laptops * 100);
    expect(by('laptops')?.orders).toBe(3);
  });

  it('counts products and out-of-stock products per category from the catalog', () => {
    expect(rows.reduce((a, r) => a + r.products, 0)).toBe(summary.products);
    expect(rows.reduce((a, r) => a + r.outOfStock, 0)).toBe(summary.outOfStock);
  });

  it('puts a line whose product is not in the catalog under "Not in the catalog"', () => {
    const ghost: Order = {
      ...orders[0]!,
      id: 'o-x',
      status: 'processing',
      lines: [{ productId: 'p-999', quantity: 1 }],
    };
    const unknown = categoryRows([ghost], products, names).find((r) => r.id === 'unknown');
    expect(unknown?.sales).toBe(ghost.total);
  });
});

describe('splitOrder', () => {
  it('splits a two-line order by line value and keeps every cent', () => {
    const order: Order = {
      ...orders[0]!,
      total: 10_001,
      lines: [
        { productId: 'a', quantity: 1 },
        { productId: 'b', quantity: 2 },
      ],
    };
    const parts = splitOrder(order, (id) => (id === 'a' ? 100 : 100));
    expect(parts.map((p) => p.sales)).toEqual([3_334, 6_667]);
    expect(parts.reduce((a, p) => a + p.sales, 0)).toBe(10_001);
  });
});

describe('monthly trend', () => {
  it('reads all four date formats; every counted order is in Aug 2026', () => {
    const months = monthlyTrend(orders);
    expect(months).toEqual([
      { key: '2026-08', label: 'Aug 2026', orders: 7, sales: REF_REVENUE * 100 },
    ]);
  });

  it('fills empty months between the first and the last', () => {
    const later: Order = {
      ...orders[0]!,
      id: 'o-oct',
      createdAt: new Date(Date.UTC(2026, 9, 2)),
      total: 100,
    };
    expect(monthlyTrend([...orders, later]).map((m) => `${m.label}:${m.orders}`)).toEqual([
      'Aug 2026:7',
      'Sept 2026:0', // en-GB's short form
      'Oct 2026:1',
    ]);
  });

  it('leaves out (and reports) orders whose date cannot be read', () => {
    const undated: Order = { ...orders[0]!, id: 'o-u', createdAt: null };
    const d = buildDashboard(summary, [...orders, undated], products, names);
    expect(d.reconciliation.undated).toBe(1);
    expect(d.months[0]?.orders).toBe(7);
  });
});

describe('reconciliation', () => {
  it('is zero when the orders add up to the summary', () => {
    expect(buildDashboard(summary, orders, products, names).reconciliation.difference).toBe(0);
  });

  it('shows the gap when the summary and the orders disagree', () => {
    const d = buildDashboard({ ...summary, revenue: REF_REVENUE + 10 }, orders, products, names);
    expect(d.reconciliation.difference).toBe(1_000);
  });
});
