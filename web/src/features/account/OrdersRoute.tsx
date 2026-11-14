/**
 * /account/orders: the signed-in shopper's orders from GET /account/orders, five a page (the API pages by
 * offset), in a Table<Order>. A "processing" order has a Cancel button: a confirmation dialog, then
 * PATCH /account/orders/:id/cancel. The row shows the order the API sends back; a 409 (it shipped meanwhile)
 * explains why and reloads the page of orders.
 */
import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { AppError, Order } from '@shared/domain';
import { cancelOrder, fetchOrders } from '../../api/endpoints';
import { Badge, Button, Modal, Table, type BadgeTone, type Column } from '../../components';
import { ErrorState, errorText } from '../../components/StatusMessage';
import { toAppError } from '../../hooks/useApi';
import { loadPlacedOrders } from '../checkout/checkout.storage';
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

const BASE_COLUMNS: readonly Column<Order>[] = [
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

type CancelState =
  | { status: 'closed' }
  | { status: 'confirming'; order: Order }
  | { status: 'cancelling'; order: Order }
  | { status: 'failed'; order: Order; error: AppError };

export function OrdersRoute() {
  useDocumentTitle('Your orders');
  const { session, signOut } = useAuth();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const token = session?.token ?? null;
  const orders = useApi(token ? `orders?page=${page}` : null, (signal) =>
    fetchOrders(page, token ?? '', signal),
  );
  // Orders the API returned from PATCH …/cancel, shown in place of the listed ones until the next reload.
  const [updated, setUpdated] = useState<ReadonlyMap<string, Order>>(new Map());
  const [cancel, setCancel] = useState<CancelState>({ status: 'closed' });
  const [announcement, setAnnouncement] = useState('');
  const cancelling = useRef(false);

  async function confirmCancel(order: Order) {
    if (!token || cancelling.current) return; // one PATCH at a time, however fast the clicks
    cancelling.current = true;
    setCancel({ status: 'cancelling', order });
    try {
      const result = await cancelOrder(order.id, token);
      setUpdated((map) => new Map(map).set(result.id, result));
      setCancel({ status: 'closed' });
      setAnnouncement(`Order ${order.id} is cancelled.`);
    } catch (error) {
      const appError = toAppError(error);
      if (appError.status === 409) {
        setCancel({ status: 'closed' });
        setAnnouncement(
          `Order ${order.id} could not be cancelled: ${appError.message}. The list is updated.`,
        );
        setUpdated(new Map());
        orders.retry();
      } else if (appError.status === 401) {
        setCancel({ status: 'closed' });
        signOut();
      } else {
        setCancel({ status: 'failed', order, error: appError });
      }
    } finally {
      cancelling.current = false;
    }
  }

  const columns: readonly Column<Order>[] = [
    ...BASE_COLUMNS,
    {
      id: 'actions',
      header: 'Actions',
      cell: (order) =>
        order.cancellable ? (
          <Button
            variant="secondary"
            size="sm"
            aria-label={`Cancel order ${order.id}`}
            onClick={() => setCancel({ status: 'confirming', order })}
          >
            Cancel
          </Button>
        ) : (
          <span className="text-sm text-text-muted">—</span>
        ),
    },
  ];

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
  const rows = (data?.items ?? []).map((order) => updated.get(order.id) ?? order);
  const listed = new Set(rows.map((o) => o.id));
  const placedHere = page === 1 ? loadPlacedOrders().filter((o) => !listed.has(o.id)) : [];
  const target = cancel.status === 'closed' ? null : cancel.order;

  return (
    <section aria-labelledby="orders-title" className="flex flex-col gap-sm">
      <h1 id="orders-title" className="text-h2 font-bold text-text">
        Your orders
      </h1>
      <p role="status" className="text-text">
        {announcement}
      </p>
      {placedHere.length > 0 && (
        <aside aria-labelledby="placed-title" className="rounded-md bg-primary-soft p-sm text-text">
          <h2 id="placed-title" className="font-bold">
            Placed in this session
          </h2>
          <ul>
            {placedHere.map((o) => (
              <li key={o.idempotencyKey}>
                {o.number}: {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'},{' '}
                {formatMoney(o.total, o.currency)} ({o.status})
              </li>
            ))}
          </ul>
          <p className="text-sm text-text-muted">
            The TechSphere API does not add new orders to this list, so they are shown from this
            tab.
          </p>
        </aside>
      )}
      <Table<Order>
        caption="Your orders"
        columns={columns}
        rows={rows}
        getRowKey={(order) => order.id}
        loading={orders.status === 'loading' && !data}
        error={orders.status === 'error' ? errorText(orders.error).message : null}
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

      <Modal
        open={target !== null}
        title={target ? `Cancel order ${target.id}?` : 'Cancel order?'}
        onClose={() => setCancel({ status: 'closed' })}
        busy={cancel.status === 'cancelling'}
        error={cancel.status === 'failed' ? errorText(cancel.error).message : undefined}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={cancel.status === 'cancelling'}
              onClick={() => setCancel({ status: 'closed' })}
            >
              Keep the order
            </Button>
            <Button
              variant="danger"
              loading={cancel.status === 'cancelling'}
              loadingLabel="Cancelling"
              onClick={() => target && void confirmCancel(target)}
            >
              Cancel the order
            </Button>
          </>
        }
      >
        {target && (
          <p>
            Order {target.id}, {formatMoney(target.total, target.currency)}, is still processing.
            Cancelling cannot be undone.
          </p>
        )}
      </Modal>
    </section>
  );
}
