// @vitest-environment jsdom
/**
 * Task 6 edge-case sweep in the browser (jsdom + Mock Service Worker): the real product, catalog and cart
 * modules in the real page markup, against an API in the TechSphere format (the API the app is graded
 * against). Each `describe` is one row of the sweep table in task_6_handoff.md; the accessibility block
 * checks the live-region announcements for cart updates.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import * as storage from '../../src/utils/storage.js';
import { PLACEHOLDER_SRC } from '../../src/utils/dom.js';
import { createHttpClient } from '../../src/api/http.js';
import { createProductApi } from '../../src/api/product-api.js';
import { toLine } from '../../src/state/cart.js';
import { createCatalogState } from '../../src/state/catalog.js';
import {
  createCartStore,
  createFlagsStore,
  createRecentStore,
  createSavedStore,
  createSessionStore,
} from '../../src/state/stores.js';
import { mount as mountProduct } from '../../src/components/product-detail.js';
import { mount as mountCatalog } from '../../src/components/catalog-view.js';
import { mount as mountCart } from '../../src/components/cart-view.js';
import { mountCheckout } from '../../src/components/checkout.js';
import { loadPage } from '../support/page.js';
import { click, screen, waitFor, within } from '../support/screen.js';

/** A TechSphere-format API on the test page's origin. */
const TS = `${globalThis.location?.origin ?? 'http://localhost:3000'}/ts`;
const requests = [];

/** TechSphere products like the kit's: p-010 has a missing image, and its specs have a null field. */
function tsProduct(n, extra = {}) {
  const id = `p-${String(n).padStart(3, '0')}`;
  return {
    id,
    name: `Nova Laptops ${n}`,
    brand: 'Nova',
    category: 'laptops',
    price: 30000 + n,
    currency: 'EGP',
    stock_status: 'in_stock',
    rating: 4,
    reviews_count: 10,
    images: [`/images/${id}.webp`],
    specs: { warranty: '1 year' },
    ...extra,
  };
}
const ALL = Array.from({ length: 24 }, (_, i) => tsProduct(i + 1));
ALL[9] = tsProduct(10, {
  images: ['/images/missing-9.webp'],
  specs: { warranty: null, weight: null },
});

const server = setupServer(
  http.get(`${TS}/products`, ({ request }) => {
    requests.push(`GET ${new URL(request.url).pathname}${new URL(request.url).search}`);
    const page = Number(new URL(request.url).searchParams.get('page') || 1);
    return HttpResponse.json({
      items: ALL.slice((page - 1) * 8, page * 8),
      page,
      total_pages: 3,
      total: ALL.length,
    });
  }),
  http.get(`${TS}/products/:id`, ({ params }) => {
    requests.push(`GET /ts/products/${params.id}`);
    const p = ALL.find((x) => x.id === params.id);
    return p
      ? HttpResponse.json(p)
      : HttpResponse.json({ error: 'Product not found' }, { status: 404 });
  }),
  http.post(`${TS}/orders`, async ({ request }) => {
    requests.push(
      `POST /ts/orders ${request.headers.get('Authorization') ? 'with token' : 'no token'}`,
    );
    const body = await request.json();
    if (!body?.items?.length)
      return HttpResponse.json({ error: 'items are required' }, { status: 400 });
    requests.push(JSON.stringify(body));
    return HttpResponse.json(
      { id: 'o-101', number: 'TS-1001', status: 'processing' },
      { status: 201 },
    );
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
beforeEach(() => {
  requests.length = 0;
  window.localStorage.clear();
  window.sessionStorage.clear();
});

const productApi = () => createProductApi({ baseURL: TS, dialect: 'techsphere' });
const stores = () => ({
  cart: createCartStore(storage),
  saved: createSavedStore(storage),
  recent: createRecentStore(storage),
});

/** Open product.html for one product id. */
async function openProduct(id) {
  await loadPage('product.html');
  mountProduct(document.getElementById('main-content'), { api: productApi(), id, ...stores() });
}

/** Open cart.html with the given TechSphere products in the cart, and the checkout wired as in pages/cart.js. */
async function openCart(lines, { signedIn = false } = {}) {
  window.localStorage.setItem(
    storage.KEYS.cart,
    JSON.stringify({
      lines: lines.map(([p, qty]) =>
        toLine(
          { ...p, price: p.price * 100, stock: 25, image: { url: PLACEHOLDER_SRC, alt: '' } },
          qty,
        ),
      ),
    }),
  );
  const session = createSessionStore(storage);
  if (signedIn) {
    session.signIn({
      token: 'test-token',
      expiresAt: Date.now() + 3_600_000,
      user: { email: 'student@techsphere.test', name: 'Test Student' },
    });
  }
  await loadPage('cart.html');
  const s = stores();
  const status = document.getElementById('cart-message');
  const say = (text) => (status.textContent = text);
  const location = {
    replaced: [],
    replace(url) {
      this.replaced.push(url);
    },
  };
  const view = mountCart(document.getElementById('main-content'), { api: productApi(), ...s });
  const checkout = mountCheckout(document.getElementById('cart-totals'), {
    cart: s.cart,
    session,
    flags: createFlagsStore(storage),
    location,
    say,
    createHttp: (onUnauthorized) =>
      createHttpClient({
        baseUrl: TS,
        dialect: 'techsphere',
        getToken: session.token,
        onUnauthorized,
      }),
  });
  await view.ready;
  return { ...s, checkout, location };
}

describe('edge 1: missing product image', () => {
  it('the product page shows the placeholder, with the product name as alt text, when the image fails', async () => {
    await openProduct('p-010');
    await screen.findByRole('heading', { level: 1, name: 'Nova Laptops 10' });
    const image = screen.getByRole('img', { name: 'Nova Laptops 10' });
    // jsdom does not load images, so the test fires the error a browser fires on the API's 404.
    // (In a real browser the 404 has usually arrived already and the placeholder is in place.)
    if (image.getAttribute('src') !== PLACEHOLDER_SRC) {
      expect(image.getAttribute('src')).toBe(`${TS}/images/missing-9.webp`);
      image.dispatchEvent(new Event('error'));
    }
    expect(image.getAttribute('src')).toBe(PLACEHOLDER_SRC);
    expect(image.getAttribute('alt')).toBe('Nova Laptops 10');
    image.dispatchEvent(new Event('error')); // even if the placeholder failed, no loop
    expect(image.getAttribute('src')).toBe(PLACEHOLDER_SRC);
  });
});

describe('edge 2: null specification fields', () => {
  it('specs that are all null show one clear line, never "null" or an empty table', async () => {
    await openProduct('p-010');
    await screen.findByText('No specifications are listed for this product.');
    expect(document.body.textContent).not.toContain('null');
    expect(screen.queryByRole('table')).toBe(null);
  });

  it('a product with real specs still shows its table', async () => {
    await openProduct('p-001');
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Warranty')).toBeTruthy();
    expect(within(table).getByText('1 year')).toBeTruthy();
  });
});

describe('edge 3: 429 rate limit', () => {
  it('the product page explains the 429 and loads the product with "Try again"', async () => {
    server.use(
      http.get(`${TS}/products/:id`, () =>
        HttpResponse.json({ error: 'Forced failure', status: 429 }, { status: 429 }),
      ),
    );
    await openProduct('p-001');
    const alert = await screen.findByRole('alert');
    await waitFor(() => within(alert).getByRole('heading', { name: 'Too many requests' }));
    expect(within(alert).getByText(/Wait a moment, then try again\./)).toBeTruthy();
    server.resetHandlers();
    click(within(alert).getByRole('button', { name: 'Try again' }));
    await screen.findByRole('heading', { level: 1, name: 'Nova Laptops 1' });
  });

  it('a 429 while placing an order keeps the cart and says so', async () => {
    server.use(
      http.post(`${TS}/orders`, () =>
        HttpResponse.json({ error: 'Forced failure', status: 429 }, { status: 429 }),
      ),
    );
    const { cart, checkout } = await openCart([[ALL[0], 1]], { signedIn: true });
    await checkout.placeOrder();
    expect(
      screen.getByText(
        'Your order was not placed. Too many requests. Wait a moment, then try again. Your cart is unchanged.',
      ),
    ).toBeTruthy();
    expect(cart.get().lines.length).toBe(1);
  });
});

describe('edge 4: empty-cart checkout attempt', () => {
  it('"Place order" on an empty cart explains itself and sends nothing', async () => {
    const { location } = await openCart([], { signedIn: true });
    const button = screen.getByRole('button', { name: 'Place order' });
    expect(button.getAttribute('aria-disabled')).toBe('true'); // still focusable, unlike disabled
    expect(
      screen.getByText(
        'Add a product to your cart to check out. Your cart is saved on this device, so nothing is lost meanwhile.',
      ),
    ).toBeTruthy();
    click(button);
    await screen.findByText('Your cart is empty. Add a product before you check out.');
    expect(requests).toEqual([]);
    expect(location.replaced).toEqual([]);
  });

  it('a cart emptied in another tab is caught when "Place order" is pressed', async () => {
    const { cart, checkout } = await openCart([[ALL[0], 1]], { signedIn: true });
    expect(screen.getByRole('button', { name: 'Place order' }).getAttribute('aria-disabled')).toBe(
      'false',
    );
    cart.set({ lines: [] }); // what the storage event from the other tab does
    await checkout.placeOrder();
    expect(
      screen.getByText('Your cart is empty. Add a product before you check out.'),
    ).toBeTruthy();
    expect(requests.filter((r) => r.startsWith('POST'))).toEqual([]);
  });

  it('with items: signed out goes to sign-in (and back); signed in places the order with the token', async () => {
    const out = await openCart([[ALL[0], 2]]);
    await out.checkout.placeOrder();
    expect(out.location.replaced).toEqual(['login.html']);
    expect(createFlagsStore(storage).take()).toEqual({
      notice: 'Please sign in to place your order. Your cart is kept.',
      returnTo: 'cart.html',
    });

    const signedIn = await openCart([[ALL[0], 2]], { signedIn: true });
    await signedIn.checkout.placeOrder();
    expect(requests.slice(-2)).toEqual([
      'POST /ts/orders with token',
      JSON.stringify({ items: [{ productId: 'p-001', qty: 2 }] }),
    ]);
    expect(
      screen.getByText(
        'Thank you! Order TS-1001 is placed and is processing. You can follow it on your account page.',
      ),
    ).toBeTruthy();
    expect(signedIn.cart.get().lines).toEqual([]);
  });
});

describe('edge 5: offset-versus-page pagination mismatch', () => {
  it('a page past the end (?page=9) moves to the last page; counts use the API page size of 8', async () => {
    window.history.replaceState(null, '', '/catalog.html?page=9');
    await loadPage('catalog.html');
    mountCatalog(document.getElementById('main-content'), {
      http: createHttpClient({ baseUrl: TS, dialect: 'techsphere' }),
      state: createCatalogState(window.location, window.history),
      debounceMs: 0,
    });
    await screen.findByText('Showing 17–24 of 24 products');
    expect(new URLSearchParams(window.location.search).get('page')).toBe('3');
    expect(requests.filter((r) => r.startsWith('GET /ts/products?'))).toContain(
      'GET /ts/products?page=9',
    );
  });
});

describe('accessibility: cart updates are announced in the live region', () => {
  it('changing a quantity, saving for later and removing each announce the result and the new total', async () => {
    await openCart([
      [ALL[0], 1],
      [ALL[1], 1],
    ]);
    const live = document.getElementById('cart-message');
    const heard = () => live.textContent.replace(/\s/g, ' '); // Intl puts a no-break space after "EGP"
    expect(live.getAttribute('role')).toBe('status'); // polite live region
    click(screen.getByRole('button', { name: 'Increase quantity of Nova Laptops 1' }));
    expect(heard()).toBe(
      'Quantity of Nova Laptops 1 is now 2. Cart total: EGP 90,004.00 for 3 items.',
    );
    click(screen.getByRole('button', { name: 'Save Nova Laptops 2 for later' }));
    expect(heard()).toBe('Nova Laptops 2 saved for later. Cart total: EGP 60,002.00 for 2 items.');
    click(screen.getByRole('button', { name: 'Remove Nova Laptops 1 from the cart' }));
    expect(heard()).toBe('Nova Laptops 1 removed from the cart. Your cart is empty.');
  });
});
