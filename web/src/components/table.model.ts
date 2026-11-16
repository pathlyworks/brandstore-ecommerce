/**
 * The pure parts of DataTable<Row>: sorting and paging, generic over the row type so every table (cart,
 * orders, admin categories, admin orders) shares one tested implementation instead of its own copy.
 */
export type SortDirection = 'ascending' | 'descending';
export type SortState = { column: string; direction: SortDirection } | null;

/** A stable sort (equal values keep their order); numbers compare as numbers, text with localeCompare. */
export function sortRows<Row>(
  rows: readonly Row[],
  value: (row: Row) => string | number,
  direction: SortDirection,
): Row[] {
  const factor = direction === 'ascending' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, key: value(row) }))
    .sort((a, b) => {
      const order =
        typeof a.key === 'number' && typeof b.key === 'number'
          ? a.key - b.key
          : String(a.key).localeCompare(String(b.key));
      return order * factor || a.index - b.index;
    })
    .map((entry) => entry.row);
}

export interface PageView<Row> {
  rows: readonly Row[];
  /** The page shown, clamped to 1..pages (a page past the end shows the last one). */
  page: number;
  pages: number;
  /** 1-based positions of the first and last row shown (0 and 0 when there are none). */
  from: number;
  to: number;
}

export function pageOf<Row>(rows: readonly Row[], page: number, pageSize?: number): PageView<Row> {
  if (!pageSize || pageSize < 1) {
    return { rows, page: 1, pages: 1, from: rows.length ? 1 : 0, to: rows.length };
  }
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(Math.max(1, Math.trunc(page) || 1), pages);
  const start = (current - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);
  return {
    rows: slice,
    page: current,
    pages,
    from: slice.length ? start + 1 : 0,
    to: start + slice.length,
  };
}
