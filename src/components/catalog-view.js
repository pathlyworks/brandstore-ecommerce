/**
 * src/components/catalog-view.js
 *
 * Wires the catalog page together. Every change of view (filters, search, sort, page, Back/Forward,
 * reload) goes through the URL-backed catalog state, and each view change triggers:
 *   1. GET /products for the visible page (loading -> results | empty | error with retry), and
 *   2. the facet counts for the filter panel (cached while search, price and rating stay the same).
 * Both use a latest-request runner: a newer view aborts the older request (AbortController), and a
 * late answer can never overwrite a newer one.
 */
import * as dom from '../utils/dom.js';
import { buildQuery } from '../utils/query-string.js';
import { buildFacets } from '../utils/facets.js';
import { createLatestRunner, SUPERSEDED } from '../utils/latest.js';
import { listAllProducts, listProducts } from '../api/products.js';
import * as productList from './product-list.js';
import * as statusMessage from './status-message.js';
import * as pagination from './pagination.js';
import * as filterBar from './filter-bar.js';
import * as demoControls from './demo-controls.js';

/**
 * "Showing 1–6 of 12 products".
 * @param {{ page: number, limit: number, total: number }} meta
 * @param {number} shown items on this page
 * @returns {string}
 */
export function resultsSummary(meta, shown) {
  if (meta.total === 0) return 'No products match your filters.';
  const from = (meta.page - 1) * meta.limit + 1;
  return `Showing ${from}–${from + shown - 1} of ${meta.total} products`;
}

/**
 * The filters that affect facet counts (not category, brand, sort or page).
 * @param {object} query
 * @returns {{ q: string, minPrice: number | null, maxPrice: number | null, minRating: number | null }}
 */
function facetFilters(query) {
  return {
    q: query.q,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    minRating: query.minRating,
  };
}

/**
 * Create the sub-components inside the catalog root.
 * @param {HTMLElement} root
 * @param {object} state catalog state
 * @param {object} ctx shared callbacks
 * @returns {object} parts
 */
function mountParts(root, state, ctx) {
  const reset = () => state.reset();
  return {
    heading: dom.qs('#results-heading', root),
    status: dom.qs('#catalog-status', root),
    sort: dom.qs('#catalog-sort', root),
    list: productList.mount(dom.qs('#catalog-results', root), { onReset: reset }),
    error: statusMessage.mount(dom.qs('#catalog-error', root), {
      onRetry: ctx.retry,
      onReset: reset,
    }),
    pages: pagination.mount(dom.qs('#catalog-pagination', root), { onPage: ctx.goToPage }),
    filters: filterBar.mount(dom.qs('#catalog-filters', root), {
      onChange: (change, options) => state.update(change, options),
      onReset: reset,
      debounceMs: ctx.debounceMs,
    }),
    demo: demoControls.mount(dom.qs('#catalog-demo', root), { onArm: ctx.retry }),
  };
}

/**
 * Show one page of results, or the empty or error state.
 * @param {object} parts
 * @param {object} state
 * @param {{ data: object[], meta: object }} body
 */
function showResults(parts, state, body) {
  const { data, meta } = body;
  if (!data.length && meta.total > 0 && state.get().page > meta.totalPages) {
    state.update({ page: meta.totalPages }, { replace: true }); // page past the end: go to the last one
    return;
  }
  if (data.length) parts.list.showProducts(data);
  else parts.list.showEmpty();
  parts.status.textContent = resultsSummary(meta, data.length);
  parts.pages.render(meta);
}

/**
 * Loader for the visible page of results, guarded by a latest-request runner.
 * @param {object} parts
 * @param {object} state
 * @param {object} http
 * @returns {(query: object, focus: boolean) => Promise<void>}
 */
function createResultsLoader(parts, state, http) {
  const runner = createLatestRunner();
  return async function loadResults(query, focus) {
    parts.error.hide();
    parts.list.showLoading(query.limit);
    parts.status.textContent = 'Loading products…';
    try {
      const run = (signal) => listProducts(http, query, { signal, headers: parts.demo.take() });
      const body = await runner.run(run);
      if (body === SUPERSEDED) return;
      showResults(parts, state, body);
      if (focus) parts.heading.focus();
    } catch (error) {
      parts.list.clear();
      parts.pages.render(null);
      parts.status.textContent = 'Products could not be loaded.';
      parts.error.show(error);
    }
  };
}

/**
 * Loader for the facet counts; the product list behind them is cached while search, price and
 * rating stay the same, so changing category, brand, sort or page costs no extra request.
 * @param {object} parts
 * @param {object} state
 * @param {object} http
 * @returns {{ load: (query: object) => Promise<void>, facets: (query: object) => object | null }}
 */
function createFacetLoader(parts, state, http) {
  const runner = createLatestRunner();
  let cache = { key: null, items: null };
  const facets = (query) => (cache.items ? buildFacets(cache.items, query) : null);
  return {
    facets,
    async load(query) {
      const key = buildQuery(facetFilters(query));
      if (cache.key !== key) {
        const run = (signal) => listAllProducts(http, facetFilters(query), { signal });
        const items = await runner.run(run).catch(() => SUPERSEDED); // errors show in the results area
        if (items === SUPERSEDED) return;
        cache = { key, items };
      }
      parts.filters.render(state.get(), facets(state.get()));
    },
  };
}

/**
 * @param {HTMLElement} root the catalog page's <main>
 * @param {{ http: object, state: object, debounceMs: number }} deps
 * @returns {{ refresh: () => void }}
 */
export function mount(root, { http, state, debounceMs }) {
  let focusNext = false;
  const ctx = {
    debounceMs,
    retry: () => refresh(),
    goToPage(page) {
      focusNext = true;
      state.update({ page });
    },
  };
  const parts = mountParts(root, state, ctx);
  const loadResults = createResultsLoader(parts, state, http);
  const facetLoader = createFacetLoader(parts, state, http);

  /** Bring every part in line with the current view. */
  function refresh() {
    const query = state.get();
    parts.sort.value = query.sort;
    parts.filters.render(query, facetLoader.facets(query));
    loadResults(query, focusNext);
    facetLoader.load(query);
    focusNext = false;
  }

  parts.sort.addEventListener('change', () => state.update({ sort: parts.sort.value }));
  state.onChange(refresh);
  refresh();
  return { refresh };
}
