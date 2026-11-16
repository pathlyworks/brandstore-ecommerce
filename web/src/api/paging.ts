/**
 * collectPages<T>: every item of a paged endpoint, page after page, for screens that need the whole set
 * (the admin dashboard: all orders, the whole catalog). Generic over the item type, so the orders
 * (offset-paged) and the products (page-numbered) share one loop. Stops at `maxPages` so a wrong `total`
 * from the API cannot loop forever, and stops when the signal is aborted.
 */
import type { Paged } from '@shared/domain';

export async function collectPages<T>(
  loadPage: (page: number, signal?: AbortSignal) => Promise<Paged<T>>,
  signal?: AbortSignal,
  maxPages = 50,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= maxPages; page += 1) {
    signal?.throwIfAborted();
    const result = await loadPage(page, signal);
    items.push(...result.items);
    if (page >= result.totalPages || result.items.length === 0) break;
  }
  return items;
}
