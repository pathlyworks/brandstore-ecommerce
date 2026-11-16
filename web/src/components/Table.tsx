/**
 * DataTable<Row>: the one data table of the app, typed by its row. Columns read cells from a Row, so a column
 * cannot ask for a field the row does not have; `getRowKey` gives each row a stable key from its data (never
 * the index, so sorting and paging keep React's identity right).
 *
 * - Sorting: sortable columns are header buttons with aria-sort (Enter/Space toggle ascending → descending).
 * - Paging: `pageSize` splits the sorted rows into pages, with Previous/Next buttons and a polite
 *   "Rows 1–5 of 9" status; changing the sort goes back to page 1. Without `pageSize` every row shows.
 * - Keyboard: the scroll container is a labelled, focusable region, so a table wider than the screen can be
 *   scrolled with the arrow keys (axe: scrollable-region-focusable).
 * - States: loading (skeleton rows, aria-busy), error (message and retry), empty (message), data.
 *
 * `Table` is the same component (the name the cart and orders screens used before paging existed).
 */
import { useId, useMemo, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button } from './Button';
import { pageOf, sortRows, type SortState } from './table.model';

export interface Column<Row> {
  /** Unique and stable: the React key of the header and of each cell. */
  id: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Makes the column sortable by this value. */
  sortValue?: ((row: Row) => string | number) | undefined;
  align?: 'start' | 'end';
  /** The cell names the row (a <th scope="row">), e.g. the product name. */
  rowHeader?: boolean;
}

export interface DataTableProps<Row> {
  caption: string;
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => string;
  /** Rows per page; leave out to show every row. */
  pageSize?: number;
  /** Sort applied before the user picks one (e.g. sales, highest first). */
  defaultSort?: SortState;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: ReactNode;
  /** Number of placeholder rows while loading. */
  skeletonRows?: number;
  /** A row under the body (e.g. totals), rendered in <tfoot>. */
  footer?: ReactNode;
  className?: string;
}

export function DataTable<Row>({
  caption,
  columns,
  rows,
  getRowKey,
  pageSize,
  defaultSort = null,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'Nothing to show.',
  skeletonRows = 3,
  footer,
  className,
}: DataTableProps<Row>) {
  const captionId = useId();
  const [sort, setSort] = useState<SortState>(defaultSort);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    const value = sort && columns.find((c) => c.id === sort.column)?.sortValue;
    return sort && value ? sortRows(rows, value, sort.direction) : rows;
  }, [rows, columns, sort]);
  const view = pageOf(sorted, page, pageSize);

  function toggle(id: string) {
    setPage(1);
    setSort((current) =>
      current?.column === id && current.direction === 'ascending'
        ? { column: id, direction: 'descending' }
        : { column: id, direction: 'ascending' },
    );
  }

  const span = columns.length;
  const showRows = !loading && !error;
  return (
    <div className={cn('flex flex-col gap-xs', className)}>
      <div
        role="region"
        aria-labelledby={captionId}
        tabIndex={0}
        className="w-full overflow-x-auto rounded-md border border-border bg-surface focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-primary focus-visible:outline-solid"
      >
        <table
          className="w-full min-w-(--size-table-min) border-collapse text-left text-md"
          aria-busy={loading || undefined}
        >
          <caption id={captionId} className="p-sm text-left text-sm font-semibold text-text-muted">
            {caption}
          </caption>
          <thead className="bg-bg">
            <tr>
              {columns.map((column) => {
                const active = sort?.column === column.id;
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={active && sort ? sort.direction : undefined}
                    className={cn(
                      'border-b-2 border-border p-sm text-sm font-semibold text-text',
                      column.align === 'end' && 'text-right',
                    )}
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggle(column.id)}
                        className="inline-flex min-h-(--size-tap-target) items-center gap-2xs rounded-sm hover:text-primary focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-primary focus-visible:outline-solid"
                      >
                        {column.header}
                        <span aria-hidden="true">
                          {active && sort ? (sort.direction === 'ascending' ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: skeletonRows }, (_, i) => `skeleton-${i}`).map((key) => (
                <tr key={key} aria-hidden="true">
                  {columns.map((column) => (
                    <td key={column.id} className="border-b border-border p-sm">
                      <span className="block h-4 animate-pulse rounded-sm bg-disabled-bg motion-reduce:animate-none" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && error && (
              <tr>
                <td colSpan={span} className="p-md">
                  <div role="alert" className="flex flex-wrap items-center gap-sm text-danger">
                    <span>{error}</span>
                    {onRetry && (
                      <Button size="sm" variant="secondary" onClick={onRetry}>
                        Try again
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
            {showRows && sorted.length === 0 && (
              <tr>
                <td colSpan={span} className="p-md text-text-muted">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {showRows &&
              view.rows.map((row) => (
                <tr key={getRowKey(row)} className="hover:bg-primary-soft">
                  {columns.map((column) =>
                    column.rowHeader ? (
                      <th
                        key={column.id}
                        scope="row"
                        className="border-b border-border p-sm font-semibold text-text"
                      >
                        {column.cell(row)}
                      </th>
                    ) : (
                      <td
                        key={column.id}
                        className={cn(
                          'border-b border-border p-sm text-text',
                          column.align === 'end' && 'text-right tabular-nums',
                        )}
                      >
                        {column.cell(row)}
                      </td>
                    ),
                  )}
                </tr>
              ))}
          </tbody>
          {showRows && footer && sorted.length > 0 && <tfoot className="bg-bg">{footer}</tfoot>}
        </table>
      </div>
      {showRows && view.pages > 1 && (
        <nav aria-label={`${caption}: pages`} className="flex flex-wrap items-center gap-sm">
          <Button
            size="sm"
            variant="secondary"
            disabled={view.page <= 1}
            onClick={() => setPage(view.page - 1)}
          >
            Previous
          </Button>
          <p role="status" className="text-sm text-text-muted">
            Rows {view.from}–{view.to} of {sorted.length} · page {view.page} of {view.pages}
          </p>
          <Button
            size="sm"
            variant="secondary"
            disabled={view.page >= view.pages}
            onClick={() => setPage(view.page + 1)}
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}

/** The same component under its earlier name (cart, orders). */
export const Table = DataTable;
export type TableProps<Row> = DataTableProps<Row>;
