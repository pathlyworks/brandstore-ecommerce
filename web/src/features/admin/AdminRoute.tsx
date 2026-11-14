/**
 * /admin: store totals from GET /admin/summary. This module is loaded lazily (React.lazy in app/routes.tsx)
 * and rendered only inside <ProtectedRoute role="admin">, so a shopper's browser never downloads it
 * (web/scripts/check-bundles.mjs and web/e2e/auth.spec.ts check that).
 */
import { fetchAdminSummary } from '../../api/endpoints';
import { ErrorState, LoadingState } from '../../components/StatusMessage';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { formatMoney } from '../../lib/money';
import { useAuth } from '../auth/AuthContext';

export const ADMIN_MODULE_MARKER = 'brandstore-admin-summary';

export default function AdminRoute() {
  useDocumentTitle('Admin summary');
  const { session } = useAuth();
  const summary = useApi(session ? `admin-summary:${session.user.email}` : null, (signal) =>
    fetchAdminSummary(signal),
  );

  return (
    <section
      aria-labelledby="page-title"
      data-module={ADMIN_MODULE_MARKER}
      className="flex flex-col gap-md"
    >
      <h1 id="page-title" className="text-h1 font-extrabold tracking-tight text-text">
        Admin summary
      </h1>
      {summary.status === 'loading' && <LoadingState label="Loading the store totals" />}
      {summary.status === 'error' && <ErrorState error={summary.error} onRetry={summary.retry} />}
      {summary.data && (
        <>
          <dl className="grid gap-sm md:grid-cols-4">
            {[
              // Revenue arrives in whole pounds; formatMoney takes cents.
              {
                label: 'Revenue',
                value: formatMoney(summary.data.revenue * 100, summary.data.currency),
              },
              { label: 'Orders', value: String(summary.data.orders) },
              { label: 'Products', value: String(summary.data.products) },
              { label: 'Out of stock', value: String(summary.data.outOfStock) },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-border bg-surface p-md">
                <dt className="text-sm text-text-muted">{item.label}</dt>
                <dd className="text-2xl font-bold text-text">{item.value}</dd>
              </div>
            ))}
          </dl>
          {summary.data.note && <p className="text-text-muted">{summary.data.note}.</p>}
        </>
      )}
    </section>
  );
}
