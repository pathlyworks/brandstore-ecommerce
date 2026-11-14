/**
 * /products: a controlled filter form (search, category, sort) whose values live in the URL, the product grid,
 * and pagination. The search box updates the URL after a pause (useDebouncedValue), so typing does not send a
 * request per key; useApi cancels the previous request whenever the query changes.
 */
import { useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { fetchProducts } from '../../api/endpoints';
import { Button, Input, Select } from '../../components';
import { EmptyState, ErrorState } from '../../components/StatusMessage';
import { useApi } from '../../hooks/useApi';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { ProductGrid, ProductGridSkeleton } from './ProductCard';
import {
  CATEGORY_OPTIONS,
  readFilters,
  SORT_OPTIONS,
  toProductQuery,
  writeFilters,
  type CatalogFilters,
} from './query';

export function ProductsRoute() {
  useDocumentTitle('Products');
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const [searchText, setSearchText] = useState(filters.search);
  const debounced = useDebouncedValue(searchText, 350);

  // The URL changed from outside the box (back button, a footer link, "Clear the filters"): the box follows.
  const [urlSearch, setUrlSearch] = useState(filters.search);
  if (filters.search !== urlSearch) {
    setUrlSearch(filters.search);
    if (filters.search !== searchText.trim()) setSearchText(filters.search);
  }

  function update(next: Partial<CatalogFilters>) {
    // Any filter change goes back to page 1, unless the change is the page itself.
    setParams(writeFilters({ ...filters, page: 1, ...next }));
  }

  // Once typing pauses (the debounced value has caught up with the box), the search goes into the URL, as one
  // history entry rather than one per key.
  useEffect(() => {
    const current = readFilters(params);
    if (debounced !== searchText || debounced.trim() === current.search) return;
    setParams(writeFilters({ ...current, search: debounced, page: 1 }), { replace: true });
  }, [debounced, searchText, params, setParams]);

  const query = toProductQuery(filters);
  const key = `products?${writeFilters(filters).toString()}`;
  const products = useApi(key, (signal) => fetchProducts(query, signal));

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update({ search: searchText });
  }

  function clearFilters() {
    setParams(new URLSearchParams());
  }

  const page = products.data;
  return (
    <section aria-labelledby="page-title" className="flex flex-col gap-lg">
      <h1 id="page-title" className="text-h1 font-extrabold tracking-tight text-text">
        Products
      </h1>

      <form
        role="search"
        aria-label="Filter products"
        onSubmit={onSubmit}
        className="grid gap-sm md:grid-cols-4 md:items-end"
      >
        <Input
          label="Search"
          name="search"
          type="search"
          value={searchText}
          maxLength={100}
          onChange={(event) => setSearchText(event.target.value)}
          className="md:col-span-2"
        />
        <Select
          label="Category"
          name="category"
          options={CATEGORY_OPTIONS}
          value={filters.category}
          onChange={(category) => update({ category })}
        />
        <Select
          label="Sort by"
          name="sort"
          options={SORT_OPTIONS}
          value={filters.sort}
          onChange={(sort) => update({ sort })}
        />
      </form>

      <p role="status" className="text-sm text-text-muted">
        {products.status === 'success' && `${products.data.total} products`}
        {products.status === 'loading' && 'Loading products…'}
      </p>

      {products.status === 'error' && (
        <ErrorState error={products.error} onRetry={products.retry} />
      )}
      {products.status === 'loading' && !page && <ProductGridSkeleton />}
      {page && page.items.length === 0 && (
        <EmptyState title="No products match these filters">
          <Button variant="secondary" onClick={clearFilters}>
            Clear the filters
          </Button>
        </EmptyState>
      )}
      {page && page.items.length > 0 && (
        <div
          aria-busy={products.status === 'loading'}
          className={products.status === 'loading' ? 'opacity-60' : undefined}
        >
          <ProductGrid products={page.items} label="Products" />
        </div>
      )}

      {page && page.totalPages > 1 && (
        <nav aria-label="Pages" className="flex items-center gap-sm">
          <Button
            variant="secondary"
            disabled={filters.page <= 1}
            onClick={() => update({ page: filters.page - 1 })}
          >
            Previous page
          </Button>
          <span className="text-text-muted">
            Page {page.page} of {page.totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={filters.page >= page.totalPages}
            onClick={() => update({ page: filters.page + 1 })}
          >
            Next page
          </Button>
        </nav>
      )}
    </section>
  );
}
