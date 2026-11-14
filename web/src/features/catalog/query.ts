/**
 * The catalog query lives in the URL (?search=&category=&sort=&page=), so it survives reload, back and
 * sharing. These functions are the only place that reads or writes it, and they never trust the URL: an
 * unknown category or sort is ignored instead of being sent to the API (which would answer 400).
 */
import type { CategorySlug, ProductQuery, ProductSort } from '@shared/api';
import type { SelectOption } from '../../components';

export type CategoryFilter = CategorySlug | 'all';
export type SortChoice = ProductSort | 'featured';

export const CATEGORY_OPTIONS: readonly SelectOption<CategoryFilter>[] = [
  { value: 'all', label: 'All categories' },
  { value: 'laptops', label: 'Laptops' },
  { value: 'phones', label: 'Phones' },
  { value: 'audio', label: 'Audio' },
  { value: 'smart-home', label: 'Smart home' },
];

export const SORT_OPTIONS: readonly SelectOption<SortChoice>[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Best rated' },
];

export interface CatalogFilters {
  search: string;
  category: CategoryFilter;
  sort: SortChoice;
  page: number;
}

function pick<T extends string>(
  options: readonly SelectOption<T>[],
  value: string | null,
  fallback: T,
): T {
  return options.find((o) => o.value === value)?.value ?? fallback;
}

export function readFilters(params: URLSearchParams): CatalogFilters {
  const page = Number.parseInt(params.get('page') ?? '1', 10);
  return {
    search: (params.get('search') ?? '').slice(0, 100),
    category: pick(CATEGORY_OPTIONS, params.get('category'), 'all'),
    sort: pick(SORT_OPTIONS, params.get('sort'), 'featured'),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Only non-default values go into the URL. */
export function writeFilters(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set('search', filters.search.trim());
  if (filters.category !== 'all') params.set('category', filters.category);
  if (filters.sort !== 'featured') params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));
  return params;
}

export function toProductQuery(filters: CatalogFilters): ProductQuery {
  const query: ProductQuery = { page: filters.page };
  if (filters.search.trim()) query.search = filters.search.trim();
  if (filters.category !== 'all') query.category = filters.category;
  if (filters.sort !== 'featured') query.sort = filters.sort;
  return query;
}
