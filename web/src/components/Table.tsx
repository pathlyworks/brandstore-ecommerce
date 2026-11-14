/**
 * Table<Row>: a data table typed by its row. Columns read cells from a Row, so a column cannot ask for a
 * field the row does not have; `getRowKey` gives each row a stable key from its data (never the index, so
 * sorting and removing rows keep React's identity right). Sortable columns are header buttons with aria-sort.
 * States: loading (skeleton rows, aria-busy), error (message and retry), empty (message), data.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button } from './Button';

export interface Column<Row> {
  /** Unique and stable: the React key of the header and of each cell. */
  id: string;
  header: string;
  cell: (row: Row) => ReactNode;
  /** Makes the column sortable by this value. */
  sortValue?: (row: Row) => string | number;
  align?: 'start' | 'end';
  /** The cell names the row (a <th scope="row">), e.g. the product name. */
  rowHeader?: boolean;
}

export interface TableProps<Row> {
  caption: string;
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  getRowKey: (row: Row) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: ReactNode;
  /** Number of placeholder rows while loading. */
  skeletonRows?: number;
  className?: string;
}

type Sort = { column: string; direction: 'ascending' | 'descending' } | null;

export function Table<Row>({
  caption,
  columns,
  rows,
  getRowKey,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'Nothing to show.',
  skeletonRows = 3,
  className,
}: TableProps<Row>) {
  const [sort, setSort] = useState<Sort>(null);

  const sorted = useMemo(() => {
    const column = sort && columns.find((c) => c.id === sort.column);
    const value = column?.sortValue;
    if (!sort || !value) return rows;
    const factor = sort.direction === 'ascending' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = value(a);
      const y = value(b);
      return (
        (typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y))) * factor
      );
    });
  }, [rows, columns, sort]);

  function toggle(id: string) {
    setSort((current) =>
      current?.column === id && current.direction === 'ascending'
        ? { column: id, direction: 'descending' }
        : { column: id, direction: 'ascending' },
    );
  }

  const span = columns.length;
  return (
    <div
      className={cn('w-full overflow-x-auto rounded-md border border-border bg-surface', className)}
    >
      <table
        className="w-full min-w-(--size-table-min) border-collapse text-left text-md"
        aria-busy={loading || undefined}
      >
        <caption className="p-sm text-left text-sm font-semibold text-text-muted">
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
                      className="inline-flex items-center gap-2xs rounded-sm hover:text-primary focus-visible:outline-(length:--focus-ring-width) focus-visible:outline-primary focus-visible:outline-solid"
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
          {!loading && !error && sorted.length === 0 && (
            <tr>
              <td colSpan={span} className="p-md text-text-muted">
                {emptyMessage}
              </td>
            </tr>
          )}
          {!loading &&
            !error &&
            sorted.map((row) => (
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
                        column.align === 'end' && 'text-right',
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ),
                )}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
