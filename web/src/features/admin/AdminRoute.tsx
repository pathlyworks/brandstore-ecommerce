/**
 * /admin: the store dashboard (Advanced Task 5). KPI cards from GET /admin/summary (sales, orders, average
 * order value), sales by category and the monthly trend (computed from the orders and the catalog: see
 * dashboard.model.ts for every definition), and the orders themselves in a sortable, paged DataTable.
 *
 * Two requests groups, so the totals appear as soon as the summary answers: the summary alone, then the
 * orders, the catalog and the category names together. The charts are hand-built (BarChart), and each has a
 * DataTable with its exact numbers.
 *
 * This module is loaded lazily (React.lazy in app/routes.tsx) and rendered only inside
 * <ProtectedRoute role="admin">, so a shopper's browser never downloads it (scripts/check-bundles.mjs).
 */
import type { Order } from '@shared/domain';
import {
  fetchAdminSummary,
  fetchAllOrders,
  fetchAllProducts,
  fetchCategories,
} from '../../api/endpoints';
import { Badge, DataTable, type Column } from '../../components';
import { ErrorState } from '../../components/StatusMessage';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatOrderDate } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { useAuth } from '../../state/AuthContext';
import { STATUS_TONE } from '../account/orderStatus';
import { BarChart } from './BarChart';
import { buildDashboard, type CategoryRow, type MonthPoint } from './dashboard.model';

export const ADMIN_MODULE_MARKER = 'brandstore-admin-summary';

const percent = new Intl.NumberFormat('en-GB', { style: 'percent', maximumFractionDigits: 1 });

function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value?: string | undefined;
  detail?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-2xs rounded-md border border-border bg-surface p-md shadow-sm">
      <dt className="text-sm font-semibold text-text-muted">{label}</dt>
      <dd className="text-2xl font-bold text-text tabular-nums">
        {value ?? (
          <span
            aria-hidden="true"
            className="inline-block h-8 w-32 animate-pulse rounded-sm bg-disabled-bg motion-reduce:animate-none"
          />
        )}
        {value === undefined && <span className="sr-only">Loading</span>}
      </dd>
      {detail && <dd className="text-sm text-text-muted">{detail}</dd>}
    </div>
  );
}

export default function AdminRoute() {
  useDocumentTitle('Store dashboard');
  const { session } = useAuth();
  const who = session ? session.user.email : null;
  const summary = useApi(who ? `admin-summary:${who}` : null, (signal) =>
    fetchAdminSummary(signal),
  );
  const details = useApi(who ? `admin-details:${who}` : null, async (signal) => {
    const [orders, products, categories] = await Promise.all([
      fetchAllOrders(signal),
      fetchAllProducts(signal),
      fetchCategories(signal),
    ]);
    return { orders, products, names: new Map(categories.map((c) => [c.id, c.name])) };
  });

  const s = summary.data;
  const d = details.data;
  // Not memoised: the React Profiler shows the whole dashboard commit at ~11 ms (CPU 4x) and
  // buildDashboard is a small part of it for 9 orders (docs/evidence/task5/profiler.json).
  const dashboard = s && d ? buildDashboard(s, d.orders, d.products, d.names) : null;
  const money = (cents: number) => formatMoney(cents, s?.currency ?? 'EGP');

  const categoryColumns: readonly Column<CategoryRow>[] = [
    {
      id: 'name',
      header: 'Category',
      rowHeader: true,
      cell: (r) => r.name,
      sortValue: (r) => r.name,
    },
    {
      id: 'products',
      header: 'Products',
      align: 'end',
      cell: (r) => r.products,
      sortValue: (r) => r.products,
    },
    {
      id: 'oos',
      header: 'Out of stock',
      align: 'end',
      cell: (r) => r.outOfStock,
      sortValue: (r) => r.outOfStock,
    },
    {
      id: 'orders',
      header: 'Orders',
      align: 'end',
      cell: (r) => r.orders,
      sortValue: (r) => r.orders,
    },
    {
      id: 'units',
      header: 'Units sold',
      align: 'end',
      cell: (r) => r.units,
      sortValue: (r) => r.units,
    },
    {
      id: 'sales',
      header: 'Sales',
      align: 'end',
      cell: (r) => money(r.sales),
      sortValue: (r) => r.sales,
    },
    {
      id: 'share',
      header: 'Share of sales',
      align: 'end',
      cell: (r) => percent.format(r.share),
      sortValue: (r) => r.share,
    },
  ];
  const monthColumns: readonly Column<MonthPoint>[] = [
    {
      id: 'month',
      header: 'Month',
      rowHeader: true,
      cell: (m) => m.label,
      sortValue: (m) => m.key,
    },
    {
      id: 'orders',
      header: 'Orders',
      align: 'end',
      cell: (m) => m.orders,
      sortValue: (m) => m.orders,
    },
    {
      id: 'sales',
      header: 'Sales',
      align: 'end',
      cell: (m) => money(m.sales),
      sortValue: (m) => m.sales,
    },
  ];
  const orderColumns: readonly Column<Order>[] = [
    { id: 'id', header: 'Order', rowHeader: true, cell: (o) => o.id, sortValue: (o) => o.id },
    {
      id: 'date',
      header: 'Placed',
      cell: (o) => formatOrderDate(o.createdAt, o.createdAtText),
      sortValue: (o) => o.createdAt?.getTime() ?? 0,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (o) => (
        <Badge tone={STATUS_TONE[o.status]} muted={o.status === 'cancelled'}>
          {o.status}
        </Badge>
      ),
      sortValue: (o) => o.status,
    },
    {
      id: 'total',
      header: 'Total',
      align: 'end',
      cell: (o) => money(o.total),
      sortValue: (o) => o.total,
    },
  ];

  const k = dashboard?.kpis;
  const rec = dashboard?.reconciliation;
  const sold = dashboard?.categories.filter((c) => c.sales > 0) ?? [];
  const top = [...sold].sort((a, b) => b.sales - a.sales)[0];
  const months = dashboard?.months ?? [];
  const busiest = [...months].sort((a, b) => b.sales - a.sales)[0];

  return (
    <section
      aria-labelledby="page-title"
      data-module={ADMIN_MODULE_MARKER}
      className="flex flex-col gap-lg"
    >
      <header className="flex flex-col gap-2xs">
        <h1 id="page-title" className="text-h1 font-extrabold tracking-tight text-text">
          Store dashboard
        </h1>
        <p className="text-text-muted">
          Sales are the gross value of orders that were not cancelled, before any costs, as GET
          /admin/summary reports them.
        </p>
      </header>

      {summary.status === 'error' ? (
        <ErrorState error={summary.error} onRetry={summary.retry} />
      ) : (
        <dl aria-label="Store totals" className="grid gap-sm sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Sales"
            value={s && money(Math.round(s.revenue * 100))}
            detail="Orders not cancelled"
          />
          <KpiCard
            label="Orders"
            value={s && String(s.orders)}
            detail={
              k
                ? `${k.countedOrders} count toward sales · ${k.cancelledOrders} cancelled`
                : undefined
            }
          />
          <KpiCard
            label="Average order value"
            value={
              k
                ? k.averageOrderValue === null
                  ? 'No orders yet'
                  : money(k.averageOrderValue)
                : undefined
            }
            detail="Sales ÷ orders not cancelled"
          />
          <KpiCard
            label="Out of stock"
            value={s && String(s.outOfStock)}
            detail={s ? `of ${s.products} products` : undefined}
          />
        </dl>
      )}

      {details.status === 'error' && (
        <div className="flex flex-col gap-xs">
          <p className="text-text">Categories, months and orders could not be loaded.</p>
          <ErrorState error={details.error} onRetry={details.retry} />
        </div>
      )}

      {rec && (
        <p
          role="status"
          className="rounded-md border border-border bg-surface p-sm text-sm text-text"
        >
          {rec.difference === 0
            ? `Category and month figures add up to the summary's sales: ${money(rec.fromOrders)} from the ${k?.countedOrders ?? 0} orders that were not cancelled (${rec.ordersListed} listed).`
            : `Check: the ${rec.ordersListed} listed orders add up to ${money(rec.fromOrders)}, ${money(Math.abs(rec.difference))} ${rec.difference > 0 ? 'less' : 'more'} than the summary's sales. Category and month figures use the listed orders.`}
          {rec.undated > 0 &&
            ` ${rec.undated} ${rec.undated === 1 ? 'order has' : 'orders have'} a date that could not be read and ${rec.undated === 1 ? 'is' : 'are'} left out of the months.`}
        </p>
      )}

      <section aria-labelledby="by-category" className="flex flex-col gap-sm">
        <h2 id="by-category" className="text-h2 font-bold text-text">
          Sales by category
        </h2>
        {dashboard && (
          <BarChart<CategoryRow>
            title="Sales by category"
            summary={
              top
                ? `${top.name} has the most sales: ${money(top.sales)}, ${percent.format(top.share)} of all sales.`
                : 'No sales yet.'
            }
            data={[...dashboard.categories].sort((a, b) => b.sales - a.sales)}
            getKey={(r) => r.id}
            getLabel={(r) => r.name}
            getValue={(r) => r.sales}
            formatValue={money}
          />
        )}
        <DataTable<CategoryRow>
          caption="Sales, orders and stock by category"
          columns={categoryColumns}
          rows={dashboard?.categories ?? []}
          getRowKey={(r) => r.id}
          defaultSort={{ column: 'sales', direction: 'descending' }}
          loading={!dashboard && details.status !== 'error'}
          skeletonRows={4}
          footer={
            dashboard && (
              <tr>
                <th scope="row" className="p-sm text-left font-semibold text-text">
                  All categories
                </th>
                <td className="p-sm text-right tabular-nums">
                  {dashboard.categories.reduce((a, r) => a + r.products, 0)}
                </td>
                <td className="p-sm text-right tabular-nums">
                  {dashboard.categories.reduce((a, r) => a + r.outOfStock, 0)}
                </td>
                <td className="p-sm text-right tabular-nums">{dashboard.kpis.countedOrders}</td>
                <td className="p-sm text-right tabular-nums">
                  {dashboard.categories.reduce((a, r) => a + r.units, 0)}
                </td>
                <td className="p-sm text-right font-semibold tabular-nums">
                  {money(dashboard.categories.reduce((a, r) => a + r.sales, 0))}
                </td>
                <td className="p-sm text-right tabular-nums">{percent.format(1)}</td>
              </tr>
            )
          }
        />
      </section>

      <section aria-labelledby="by-month" className="flex flex-col gap-sm">
        <h2 id="by-month" className="text-h2 font-bold text-text">
          Monthly trend
        </h2>
        {dashboard && months.length > 0 && (
          <>
            <BarChart<MonthPoint>
              orientation="vertical"
              title="Sales per month"
              summary={
                months.length === 1
                  ? `All sales so far are from ${months[0]?.label}: ${money(months[0]?.sales ?? 0)}.`
                  : `${months.length} months; the highest is ${busiest?.label} with ${money(busiest?.sales ?? 0)}.`
              }
              data={months}
              getKey={(m) => m.key}
              getLabel={(m) => m.label}
              getValue={(m) => m.sales}
              formatValue={money}
            />
            {months.length === 1 && (
              <p className="text-sm text-text-muted">
                Every order that counts is from {months[0]?.label}, so the trend has one month so
                far; it grows as orders from more months arrive.
              </p>
            )}
          </>
        )}
        {dashboard && months.length === 0 && (
          <p className="text-text-muted">No dated orders yet.</p>
        )}
        <DataTable<MonthPoint>
          caption="Sales and orders per month"
          columns={monthColumns}
          rows={months}
          getRowKey={(m) => m.key}
          loading={!dashboard && details.status !== 'error'}
          skeletonRows={1}
        />
      </section>

      <section aria-labelledby="orders" className="flex flex-col gap-sm">
        <h2 id="orders" className="text-h2 font-bold text-text">
          Orders
        </h2>
        <DataTable<Order>
          caption="Every order, cancelled ones included"
          columns={orderColumns}
          rows={d?.orders ?? []}
          getRowKey={(o) => o.id}
          pageSize={5}
          defaultSort={{ column: 'date', direction: 'descending' }}
          loading={!d && details.status !== 'error'}
          skeletonRows={5}
          emptyMessage="No orders yet."
        />
      </section>
    </section>
  );
}
