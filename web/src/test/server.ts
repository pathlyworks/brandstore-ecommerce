/**
 * MSW handlers that behave like the TechSphere API over the captured data: 8 products a page, filters,
 * sort, 404 with {error}, login with 401, orders by offset and limit behind a Bearer token.
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE } from '../config';
import { categories, freshToken, orders, products, session, SHOPPER } from './fixtures';

const PAGE_SIZE = 8;

/** What the handlers changed or received, reset after every test (setup.ts). */
export const apiState = {
  orders: structuredClone(orders),
  placed: [] as unknown[],
  reset() {
    this.orders = structuredClone(orders);
    this.placed = [];
  },
};

const authorised = (request: Request) =>
  request.headers.get('Authorization')?.startsWith('Bearer ') ?? false;
const unauthorised = () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
const api = (path: string) => `${API_BASE}${path}`;
const price = (value: number | string) =>
  typeof value === 'number' ? value : Number(value.replace(/[^\d.]/g, ''));

export const handlers = [
  http.get(api('/categories'), () => HttpResponse.json(categories)),

  http.get(api('/products'), ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase();
    const category = url.searchParams.get('category');
    const sort = url.searchParams.get('sort');
    const page = Number(url.searchParams.get('page') ?? '1');
    if (sort && !['price_asc', 'price_desc', 'rating'].includes(sort)) {
      return HttpResponse.json({ error: 'Invalid sort' }, { status: 400 });
    }
    let list = products.filter(
      (p) =>
        (!search || p.name.toLowerCase().includes(search)) &&
        (!category || p.category === category),
    );
    if (sort === 'price_asc') list = [...list].sort((a, b) => price(a.price) - price(b.price));
    if (sort === 'price_desc') list = [...list].sort((a, b) => price(b.price) - price(a.price));
    if (sort === 'rating') list = [...list].sort((a, b) => b.rating - a.rating);
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    return HttpResponse.json({
      items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
      page,
      total_pages: totalPages,
      total: list.length,
    });
  }),

  http.get(api('/products/:id'), ({ params }) => {
    const product = products.find((p) => p.id === params.id);
    return product
      ? HttpResponse.json(product)
      : HttpResponse.json({ error: 'Product not found' }, { status: 404 });
  }),

  http.post(api('/auth/login'), async ({ request }) => {
    const { email, password } = (await request.json()) as { email?: string; password?: string };
    if (email !== SHOPPER.email || password !== SHOPPER.password) {
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    return HttpResponse.json({ token: freshToken(email), user: session.user });
  }),

  http.get(api('/account/orders'), ({ request }) => {
    if (!authorised(request)) return unauthorised();
    const url = new URL(request.url);
    const offset = Number(url.searchParams.get('offset') ?? '0');
    const limit = Number(url.searchParams.get('limit') ?? '5');
    const list = apiState.orders;
    return HttpResponse.json({
      items: list.slice(offset, offset + limit),
      offset,
      limit,
      total: list.length,
    });
  }),

  // Like the kit: 404 unknown, 409 when shipped, delivered or cancelled, else 200 with the cancelled order.
  http.patch(api('/account/orders/:id/cancel'), ({ request, params }) => {
    if (!authorised(request)) return unauthorised();
    const order = apiState.orders.find((o) => o.id === params.id);
    if (!order) return HttpResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'processing')
      return HttpResponse.json({ error: `Order is ${order.status}` }, { status: 409 });
    order.status = 'cancelled';
    return HttpResponse.json(order);
  }),

  http.get(api('/account/addresses'), ({ request }) => {
    if (!authorised(request)) return unauthorised();
    return HttpResponse.json([
      { id: 'a-1', city: 'Cairo', street: '90th Street' },
      { id: 'a-2', city: 'Giza', street: 'Pyramids Rd' },
    ]);
  }),

  // Like the kit: 400 without items, else 201 { id, number, status }. It does not de-duplicate.
  http.post(api('/orders'), async ({ request }) => {
    if (!authorised(request)) return unauthorised();
    const body = (await request.json()) as { items?: unknown[] } | null;
    if (!body?.items?.length)
      return HttpResponse.json({ error: 'items are required' }, { status: 400 });
    apiState.placed.push(body);
    const n = apiState.placed.length;
    return HttpResponse.json(
      { id: `o-${100 + n}`, number: `TS-${1000 + n}`, status: 'processing' },
      { status: 201 },
    );
  }),
];

export const server = setupServer(...handlers);
export { api };
