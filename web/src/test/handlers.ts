/**
 * MSW handlers (no Node-only imports: the tests use them through test/server.ts, the GitHub Pages demo build
 * through demo/installDemoApi.ts) that behave like the TechSphere API over the captured data: 8 products a page, filters,
 * sort, 404 with {error}, login with 401, orders by offset and limit behind a Bearer token.
 */
import { http, HttpResponse } from 'msw';
import { API_BASE } from '../config';
import { ADMIN, categories, freshToken, orders, products, session, SHOPPER } from './fixtures';

const PAGE_SIZE = 8;

/** What the handlers changed or received, reset after every test (setup.ts). */
export const apiState = {
  orders: structuredClone(orders),
  placed: [] as unknown[],
  /** true → every token is refused (the server ended the session: expired, revoked). */
  rejectTokens: false,
  reset() {
    this.orders = structuredClone(orders);
    this.placed = [];
    this.rejectTokens = false;
  },
};

/** Like the kit's read_token: the Bearer token's claims while `exp` is in the future, else null. */
function claims(request: Request): { sub: string; role: string } | null {
  const match = /^Bearer\s+(\S+)$/.exec(request.headers.get('Authorization') ?? '');
  if (!match?.[1] || apiState.rejectTokens) return null;
  try {
    const part = match[1].split('.')[1] ?? '';
    const data = JSON.parse(atob(part)) as { sub: string; role?: string; exp: number };
    return data.exp * 1000 > Date.now() ? { sub: data.sub, role: data.role ?? 'shopper' } : null;
  } catch {
    return null;
  }
}
const authorised = (request: Request) => claims(request) !== null;
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
    if (email === ADMIN.email && password === ADMIN.password) {
      return HttpResponse.json({
        token: freshToken(email, Date.now(), 'admin'),
        user: { email, name: 'Admin', role: 'admin' },
      });
    }
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

  // Like the kit: 400 for a bad email or a password under 8 characters, or a taken email; 201 signed in.
  http.post(api('/auth/register'), async ({ request }) => {
    const {
      email = '',
      password = '',
      name = '',
    } = ((await request.json()) ?? {}) as {
      email?: string;
      password?: string;
      name?: string;
    };
    if (!email.includes('@') || password.length < 8)
      return HttpResponse.json(
        { error: 'Invalid email or password (min 8 characters)' },
        { status: 400 },
      );
    if (email === SHOPPER.email || email === ADMIN.email)
      return HttpResponse.json({ error: 'Email already registered' }, { status: 400 });
    return HttpResponse.json({ token: freshToken(email), user: { email, name } }, { status: 201 });
  }),

  // Like the kit: 401 without a valid token, 403 for a shopper.
  http.get(api('/admin/summary'), ({ request }) => {
    const who = claims(request);
    if (!who) return unauthorised();
    if (who.role !== 'admin') return HttpResponse.json({ error: 'Forbidden' }, { status: 403 });
    // Computed like the kit's server.py (admin_summary), from this mock's own orders and products, so the
    // dashboard tests compare against the same rule the grader's reference calculator uses.
    return HttpResponse.json({
      revenue: apiState.orders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.total, 0),
      orders: apiState.orders.length,
      products: products.length,
      out_of_stock: products.filter((p) => p.stock_status === 'out_of_stock').length,
      currency: 'EGP',
      note: 'Revenue is gross sales, not profit',
    });
  }),
];

export { api };
