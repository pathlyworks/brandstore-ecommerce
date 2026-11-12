// @vitest-environment node
/**
 * Integration: the real auth and account modules against the OFFICIAL TechSphere API
 * (api/techsphere/server.py, the API the app is graded against). Skipped when Python is missing.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHttpClient } from '../../src/api/http.js';
import { login, register } from '../../src/api/auth.js';
import {
  cancelOrder,
  deleteAddress,
  listAddresses,
  listOrders,
  updateAddress,
} from '../../src/api/account.js';
import { findPython, startTechsphere } from '../support/techsphere-server.mjs';

const run = findPython() ? describe : describe.skip;
let api;
let token = null;
let unauthorized = 0;
const http = () =>
  createHttpClient({
    baseUrl: api.url,
    dialect: 'techsphere',
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

run('TechSphere API: sign-in, orders, addresses', () => {
  beforeAll(async () => {
    api = await startTechsphere();
  });
  afterAll(() => api?.stop());

  it('wrong credentials -> 401 INVALID_CREDENTIALS (distinct from 400)', async () => {
    const error = await failure(
      login(http(), { email: 'student@techsphere.test', password: 'nope' }),
    );
    expect([error.status, error.code]).toEqual([401, 'INVALID_CREDENTIALS']);
  });
  it('register: 400 for a taken email or short password, 201 + token for a new account', async () => {
    const taken = await failure(
      register(http(), { name: 'S', email: 'student@techsphere.test', password: 'Passw0rd!x' }),
    );
    expect([taken.status, taken.code]).toEqual([400, 'EMAIL_TAKEN']);
    expect(
      (await failure(register(http(), { name: 'S', email: 'x@y.z', password: 'short' }))).status,
    ).toBe(400);
    const session = await register(http(), {
      name: 'New',
      email: 'new@techsphere.test',
      password: 'LongEnough1',
    });
    expect([typeof session.token, session.expiresAt > Date.now()]).toEqual(['string', true]);
  });
  it('login -> token with expiry; the token goes in the Authorization header, never the URL', async () => {
    await api.reset();
    const session = await login(http(), {
      email: 'student@techsphere.test',
      password: 'Passw0rd!',
    });
    token = session.token;
    expect(session.user).toEqual({
      email: 'student@techsphere.test',
      name: 'Test Student',
      role: 'shopper',
    });
    const page2 = await listOrders(http(), { page: 2, limit: 5 });
    expect([page2.data.length, page2.meta.total, page2.meta.totalPages]).toEqual([4, 9, 2]);
    const requests = await api.log();
    const account = requests.filter((r) => r.path.startsWith('/account'));
    expect(account.every((r) => r.auth)).toBe(true);
    expect(requests.some((r) => JSON.stringify([r.path, r.query]).includes(token))).toBe(false);
    expect(account[0].query).toEqual({ limit: '5', offset: '5' });
  });
  it('cancel: 200 for a processing order, 409 for a shipped one', async () => {
    expect((await cancelOrder(http(), 'o-001')).status).toBe('cancelled');
    const error = await failure(cancelOrder(http(), 'o-002'));
    expect([error.status, error.code]).toEqual([409, 'ORDER_NOT_CANCELLABLE']);
  });
  it('addresses: list, PUT (only city and street sent), DELETE (204)', async () => {
    const [first] = await listAddresses(http());
    const saved = await updateAddress(http(), {
      ...first,
      street: '1 Nile Corniche',
      city: 'Cairo',
    });
    expect([saved.street, saved.city]).toEqual(['1 Nile Corniche', 'Cairo']);
    const put = (await api.log()).filter((r) => r.method === 'PUT').pop();
    expect(put.body).toEqual({ city: 'Cairo', street: '1 Nile Corniche' });
    await deleteAddress(http(), first.id);
    expect((await listAddresses(http())).map((a) => a.id)).toEqual(['a-2']);
  });
  it('an expired token -> 401 and onUnauthorized is called', async () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: 'student@techsphere.test', role: 'shopper', exp: 1 }),
    ).toString('base64url');
    token = `eyJhbGciOiJub25lIn0.${payload}.mock`;
    const before = unauthorized;
    expect((await failure(listOrders(http()))).status).toBe(401);
    expect(unauthorized).toBe(before + 1);
  });
});
