/** Unit tests for the TechSphere API translation (src/api/techsphere.js) and its use in both API clients. */
import { describe, expect, it } from 'vitest';
import {
  fromTechsphere,
  priceToCents,
  toAppError,
  toAppProduct,
  toTechsphereRequest,
} from '../../src/api/techsphere.js';
import { createHttpClient } from '../../src/api/http.js';
import { createProductApi, fetchProduct } from '../../src/api/product-api.js';

/** The error a promise rejects with (the Node test shim has no .rejects). */
async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected the promise to reject');
}

/** The listed fields of an object, to compare with toEqual. */
const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k]]));

const LAPTOP = {
  id: 'p-001',
  name: 'Nova Laptop 14',
  category: 'laptops',
  brand: 'Nova',
  price: 'EGP 33,999',
  currency: 'EGP',
  stock_status: 'out_of_stock',
  rating: 4.5,
  reviews_count: 120,
  specs: { ram: '16 GB', storage: 512 },
};

describe('techsphere translation', () => {
  it('reads number and formatted string prices as cents', () => {
    expect(priceToCents(32999)).toBe(3299900);
    expect(priceToCents('EGP 33,999')).toBe(3399900);
    expect(Number.isNaN(priceToCents('n/a'))).toBe(true);
  });

  it('maps a product to the app shape, with stock from stock_status', () => {
    const p = toAppProduct(LAPTOP);
    expect(pick(p, ['id', 'price', 'currency', 'stock', 'reviewCount'])).toEqual({
      id: 'p-001',
      price: 3399900,
      currency: 'EGP',
      stock: 0,
      reviewCount: 120,
    });
    expect(p.specs).toEqual([
      { label: 'ram', value: '16 GB' },
      { label: 'storage', value: '512' },
    ]);
    expect(toAppProduct({ ...LAPTOP, stock_status: 'low' }).stock).toBe(3);
    const { stock_status: _, ...noStatus } = LAPTOP;
    expect(toAppProduct(noStatus).stock).toBe(25); // missing status: treated as in stock
  });

  it('translates the catalog query to TechSphere names', () => {
    expect(
      toTechsphereRequest(
        '/products?limit=6&q=nova&minPrice=150050&maxPrice=300000&minRating=4&sort=rating_desc',
      ),
    ).toBe('/products?max_price=3000&min_price=1500&min_rating=4&search=nova&sort=rating');
    expect(toTechsphereRequest('/products?sort=name_asc&page=2&category=laptops')).toBe(
      '/products?category=laptops&page=2',
    );
    expect(toTechsphereRequest('/products?limit=50')).toBe('/products');
    expect(toTechsphereRequest('/categories')).toBe('/categories');
  });

  it('maps list and detail bodies', () => {
    const list = fromTechsphere('/products?page=1', {
      items: [LAPTOP],
      page: 1,
      total_pages: 3,
      total: 24,
    });
    expect(list.meta).toEqual({ page: 1, limit: 1, total: 24, totalPages: 3 });
    expect(list.data[0].price).toBe(3399900);
    expect(fromTechsphere('/products/p-001', LAPTOP).data.id).toBe('p-001');
    expect(fromTechsphere('/categories', ['laptops'])).toEqual(['laptops']);
  });

  it('maps { error: "text" } to the app error shape', () => {
    expect(toAppError(404, '/products/x', { error: 'Product not found' })).toEqual({
      error: { code: 'NOT_FOUND', message: 'Product not found', details: [] },
    });
    expect(toAppError(401, '/auth/login', { error: 'bad' }).error.code).toBe('INVALID_CREDENTIALS');
    const already = { error: { code: 'X', message: 'y' } };
    expect(toAppError(400, '/products', already)).toBe(already);
  });
});

describe('the API clients in TechSphere mode', () => {
  it('fetch client: sends TechSphere query names and returns the app shape', async () => {
    const urls = [];
    const fetchImpl = async (url) => {
      urls.push(url);
      return new Response(JSON.stringify({ items: [LAPTOP], page: 1, total_pages: 1, total: 1 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const http = createHttpClient({
      baseUrl: 'http://127.0.0.1:4010',
      fetchImpl,
      dialect: 'techsphere',
    });
    const body = await http.get('/products?q=nova&sort=rating_desc&limit=6');
    expect(urls[0]).toBe('http://127.0.0.1:4010/products?search=nova&sort=rating');
    expect(pick(body.data[0], ['id', 'stock'])).toEqual({ id: 'p-001', stock: 0 });
  });

  it('fetch client: a TechSphere error becomes an ApiError with a code', async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    const http = createHttpClient({ baseUrl: '', fetchImpl, dialect: 'techsphere' });
    const error = await rejection(http.get('/products/p-999'));
    expect(pick(error, ['status', 'code'])).toEqual({ status: 404, code: 'NOT_FOUND' });
  });

  it('Axios client: no X-Client-Id (blocked by the API CORS rules) and the product in app shape', async () => {
    const seen = [];
    const adapter = async (config) => {
      seen.push(config);
      return { data: LAPTOP, status: 200, statusText: '', headers: {}, config, request: {} };
    };
    const api = createProductApi({
      baseURL: 'http://127.0.0.1:4010',
      adapter,
      dialect: 'techsphere',
    });
    const product = await fetchProduct(api, 'p-001');
    expect(pick(product, ['id', 'price', 'stock'])).toEqual({
      id: 'p-001',
      price: 3399900,
      stock: 0,
    });
    expect(seen[0].headers.has('X-Client-Id')).toBe(false);
    expect(seen[0].headers.get('Accept')).toBe('application/json');
  });

  it('Axios client: a TechSphere 404 becomes NOT_FOUND', async () => {
    const adapter = async (config) => {
      const error = new Error('Request failed with status code 404');
      error.config = config;
      error.response = { data: { error: 'Product not found' }, status: 404, headers: {}, config };
      throw error;
    };
    const api = createProductApi({ baseURL: '', adapter, dialect: 'techsphere' });
    const error = await rejection(fetchProduct(api, 'p-999'));
    expect(pick(error, ['status', 'code'])).toEqual({ status: 404, code: 'NOT_FOUND' });
  });

  it('our own mock is unchanged (brandstore mode keeps X-Client-Id and the body as is)', async () => {
    const seen = [];
    const adapter = async (config) => {
      seen.push(config);
      return {
        data: { data: { id: 'smartwatch' } },
        status: 200,
        statusText: '',
        headers: {},
        config,
        request: {},
      };
    };
    const api = createProductApi({ baseURL: '/api', adapter, dialect: 'brandstore' });
    expect((await fetchProduct(api, 'smartwatch')).id).toBe('smartwatch');
    expect(String(seen[0].headers.get('X-Client-Id')).startsWith('web-')).toBe(true);
  });
});
