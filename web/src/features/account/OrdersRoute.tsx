/** /account/orders: the signed-in shopper's orders, five a page (the API pages by offset), in a Table<Order>. */
import { useSearchParams } from 'react-router';
import type { Order } from '@shared/domain';
import { fetchOrders } from '../../api/endpoints';
import { Badge, Button, Table, type BadgeTone, type Column } from '../../components';
import { ErrorState } from '../../components/StatusMessage';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatOrderDate } from '../../lib/dates';
import { formatMoney } from '../../lib/money';
import { useAuth } from '../auth/AuthContext';

const STATUS_TONE: Record<Order['status'], BadgeTone> = {
  processing: 'info',
  shipped: 'success',
  delivered: 'success',
  cancelled: 'neutral',
};

const COLUMNS: readonly Column<Order>[] = [
  {
    id: 'id',
    header: 'Order',
    rowHeader: true,
    cell: (order) => order.number ?? order.id,
    sortValue: (order) => order.id,
  },
  {
    id: 'date',
    header: 'Placed',
    cell: (order) => formatOrderDate(order.createdAt, order.createdAtText),
    sortValue: (order) => order.createdAt?.getTime() ?? 0,
  },
  {
    id: 'items',
    header: 'Items',
    align: 'end',
    cell: (order) => order.lines.reduce((n, line) => n + line.quantity, 0),
  },
  {
    id: 'total',
    header: 'Total',
    align: 'end',
    cell: (order) => formatMoney(order.total, order.currency),
    sortValue: (o) => o.total,
  },
  {
    id: 'status',
    header: 'Status',
    cell: (order) => <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>,
  },
];

export function OrdersRoute() {
  useDocumentTitle('Your orders');
  const { session, signOut } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const token = session?.token ?? null;
  const orders = useApi(token ? `orders?page=${page}` : null, (signal) =>
    fetchOrders(page, token ?? '', signal),
  );

  if (orders.status === 'error' && orders.error.code === 'UNAUTHENTICATED') {
    // The token was refused (expired or revoked): signing out sends RequireAuth to /login?next=…
    return (
      <div className="flex flex-col items-start gap-sm">
        <ErrorState error={orders.error} />
        <Button onClick={signOut}>Sign in again</Button>
      </div>
    );
  }

  const data = orders.data;
  return (
    <section aria-labelledby="orders-title" className="flex flex-col gap-sm">
      <h1 id="orders-title" className="text-h2 font-bold text-text">
        Your orders
      </h1>
      <Table<Order>
        caption="Your orders"
        columns={COLUMNS}
        rows={data?.items ?? []}
        getRowKey={(order) => order.id}
        loading={orders.status === 'loading' && !data}
        error={orders.status === 'error' ? orders.error.message : null}
        onRetry={orders.retry}
        emptyMessage="You have not placed any orders yet."
        skeletonRows={5}
      />
      {data && data.totalPages > 1 && (
        <nav aria-label="Order pages" className="flex items-center gap-sm">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setParams({ page: String(page - 1) })}
          >
            Newer orders
          </Button>
          <span className="text-text-muted">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= data.totalPages}
            onClick={() => setParams({ page: String(page + 1) })}
          >
            Older orders
          </Button>
        </nav>
      )}
    </section>
  );
}
