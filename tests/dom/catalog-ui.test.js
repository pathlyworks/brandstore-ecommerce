// @vitest-environment jsdom
/**
 * Integration: the real catalog module (components/catalog-view.js with the fetch client, URL state,
 * filter panel, list, pagination and error box) rendered into the real catalog.html markup, against
 * Mock Service Worker answering 200, empty, 401, 429 and 500. Assertions use what the shopper sees:
 * text, roles and accessible names, never ids or class names.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { createHttpClient } from '../../src/api/http.js';
import { createCatalogState } from '../../src/state/catalog.js';
import { mount } from '../../src/components/catalog-view.js';
import { API, apiError, handlers, seen } from '../support/api-handlers.js';
import { loadPage } from '../support/page.js';
import { click, screen, waitFor, within } from '../support/screen.js';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(async () => {
  seen.length = 0;
  window.history.replaceState(null, '', '/catalog.html');
  await loadPage('catalog.html');
});

/** Mount the catalog exactly as src/pages/catalog.js does, with the test API address. */
function mountCatalog() {
  return mount(document.getElementById('main-content'), {
    http: createHttpClient({ baseUrl: API }),
    state: createCatalogState(window.location, window.history),
    debounceMs: 0,
  });
}

/** Make every GET /products answer with this response. */
const productsAnswer = (respond) => server.use(http.get(`${API}/products`, respond));

/** The "Products" region that holds the results. */
const results = () => within(screen.getByRole('region', { name: 'Products' }));

describe('catalog against the API (MSW)', () => {
  it('200: shows the first page of products as links, with prices and a results count', async () => {
    mountCatalog();
    await screen.findByText('Showing 1–6 of 12 products');
    const links = results().getAllByRole('link');
    expect(links.length).toBe(6);
    expect(links[0].textContent).toBe('Wireless Headphones Pro');
    expect(results().getByText('$199.99')).toBeTruthy();
    expect(results().queryByRole('alert')).toBe(null);
  });

  it('200: choosing a category asks the API for it and shows only those products', async () => {
    mountCatalog();
    await screen.findByText('Showing 1–6 of 12 products');
    click(await screen.findByRole('radio', { name: /^Electronics \(4\)$/ }));
    await screen.findByText('Showing 1–4 of 4 products');
    const names = results()
      .getAllByRole('link')
      .map((a) => a.textContent);
    expect(names).toEqual([
      'Wireless Headphones Pro',
      'Ergonomic Smartwatch',
      'Portable Bluetooth Speaker',
      'USB-C 7-in-1 Hub',
    ]);
    expect(seen.some((url) => new URL(url).searchParams.get('category') === 'electronics')).toBe(
      true,
    );
    expect(window.location.search).toContain('category=electronics');
  });

  it('empty: says nothing matches and offers to clear the filters', async () => {
    productsAnswer(() =>
      HttpResponse.json({ data: [], meta: { page: 1, limit: 6, total: 0, totalPages: 1 } }),
    );
    mountCatalog();
    await screen.findByRole('heading', { name: 'No products match your filters' });
    expect(screen.getByText('No products match your filters.')).toBeTruthy();
    expect(results().getByRole('button', { name: 'Clear all filters' })).toBeTruthy();
    expect(results().queryAllByRole('link')).toEqual([]);
  });

  it('401: tells the shopper to sign in again, with a retry button', async () => {
    productsAnswer(() => apiError(401));
    mountCatalog();
    const alert = await results().findByRole('alert');
    await waitFor(() => within(alert).getByRole('heading', { name: 'Please sign in again' }));
    expect(within(alert).getByText('Error 401')).toBeTruthy();
    expect(within(alert).getByRole('button', { name: 'Try again' })).toBeTruthy();
    expect(screen.getByText('Products could not be loaded.')).toBeTruthy();
  });

  it('429: says to slow down, with the Retry-After wait on a disabled button', async () => {
    productsAnswer(() => apiError(429, { retryAfter: 30 }));
    mountCatalog();
    const alert = await results().findByRole('alert');
    await waitFor(() => within(alert).getByRole('heading', { name: 'Too many requests' }));
    expect(within(alert).getByText(/Wait 30 seconds, then try again\./)).toBeTruthy();
    const button = within(alert).getByRole('button', { name: 'Try again in 30 s' });
    expect(button.disabled).toBe(true);
  });

  it('500: explains the problem; "Try again" loads the products once the API recovers', async () => {
    productsAnswer(() => apiError(500));
    mountCatalog();
    const alert = await results().findByRole('alert');
    await waitFor(() =>
      within(alert).getByRole('heading', { name: 'Something went wrong on our side' }),
    );
    expect(results().queryAllByRole('link')).toEqual([]);

    server.resetHandlers(); // the API works again
    click(within(alert).getByRole('button', { name: 'Try again' }));
    await screen.findByText('Showing 1–6 of 12 products');
    expect(results().queryByRole('alert')).toBe(null);
    expect(results().getAllByRole('link').length).toBe(6);
  });
});
