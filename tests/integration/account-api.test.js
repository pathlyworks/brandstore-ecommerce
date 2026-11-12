// @vitest-environment node
/** Integration: the auth and account modules against the project's own mock (BrandStore format). */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { start } from '../../mock-server/server.mjs';
import { createHttpClient } from '../../src/api/http.js';
import { login, register } from '../../src/api/auth.js';
import {
  cancelOrder,
  deleteAddress,
  listAddresses,
  listOrders,
  updateAddress,
} from '../../src/api/account.js';

let server;
let token = null;
let unauthorized = 0;
const http = () =>
  createHttpClient({
    baseUrl: server.url,
    getToken: () => token,
    onUnauthorized: () => (unauthorized += 1),
  });

/** Await a rejection and return the error. */
async function failure(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('expected a failure');
}

describe('BrandStore mock: sign-in and account', () => {
  beforeAll(async () => {
    server = await start({ port: 0, rateLimitMax: 10000 });
  });
  afterAll(() => server.close());

  it('400 for invalid input, 401 for wrong credentials', async () => {
    expect((await failure(login(http(), { email: 'not-an-email', password: 'x' }))).status).toBe(
      400,
    );
    expect(
      (await failure(login(http(), { email: 'demo@brandstore.test', password: 'wrong' }))).status,
    ).toBe(401);
  });
  it('register: 201 and signed in; the same email again is 400 EMAIL_TAKEN', async () => {
    const session = await register(http(), {
      name: 'Ahmed',
      email: 'ahmed@brandstore.test',
      password: 'LongEnough1',
    });
    expect(session.user.name).toBe('Ahmed');
    expect(
      (
        await failure(
          register(http(), { name: 'A', email: 'ahmed@brandstore.test', password: 'LongEnough1' }),
        )
      ).code,
    ).toBe('EMAIL_TAKEN');
  });
  it('orders, cancel and addresses with the token', async () => {
    token = (await login(http(), { email: 'demo@brandstore.test', password: 'Passw0rd!' })).token;
    const { data } = await listOrders(http(), { page: 1, limit: 5 });
    expect(data.map((o) => o.id)).toEqual(['o-1003', 'o-1002', 'o-1001']);
    expect((await cancelOrder(http(), 'o-1003')).status).toBe('cancelled');
    expect((await failure(cancelOrder(http(), 'o-1001'))).code).toBe('ORDER_NOT_CANCELLABLE');
    const [home] = await listAddresses(http());
    expect((await updateAddress(http(), { ...home, city: 'Giza' })).city).toBe('Giza');
    await deleteAddress(http(), home.id);
    expect(await listAddresses(http())).toEqual([]);
  });
  it('a rejected token -> 401 and onUnauthorized', async () => {
    token = 'not-a-real-token';
    const before = unauthorized;
    expect((await failure(listOrders(http()))).status).toBe(401);
    expect(unauthorized).toBe(before + 1);
  });
});
