/**
 * MSW handlers that behave like the TechSphere API over the captured data: 8 products a page, filters,
 * sort, 404 with {error}, login with 401, orders by offset and limit behind a Bearer token.
 */
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE } from '../config';
import { categories, freshToken, orders, products, session, SHOPPER } from './fixtures';

const PAGE_SIZE = 8;
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
    if (!request.headers.get('Authorization')?.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    const offset = Number(url.searchParams.get('offset') ?? '0');
    const limit = Number(url.searchParams.get('limit') ?? '5');
    return HttpResponse.json({
      items: orders.slice(offset, offset + limit),
      offset,
      limit,
      total: orders.length,
    });
  }),
];

export const server = setupServer(...handlers);
export { api };
