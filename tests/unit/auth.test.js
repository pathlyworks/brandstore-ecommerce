/**
 * Unit tests for Task 4: JWT expiry, the pure session rules, the session and flags stores (logout keeps
 * the cart), the auth API module (credentials only in the body), form validation, error wording that
 * keeps 400 and 401 apart, order dates, the account normalisation and the TechSphere translation.
 */
import { describe, expect, it } from 'vitest';
import { decodeJwtPayload, expiryOf } from '../../src/utils/jwt.js';
import {
  isActive,
  rehydrateFlags,
  rehydrateSession,
  SIGNED_OUT,
  withFlags,
} from '../../src/state/session.js';
import { createCartStore, createFlagsStore, createSessionStore } from '../../src/state/stores.js';
import { createStorage, KEYS } from '../../src/utils/storage.js';
import { login, register, sessionFromResponse } from '../../src/api/auth.js';
import { ApiError } from '../../src/api/errors.js';
import { validateAddress, validateLogin, validateRegister } from '../../src/utils/validate.js';
import { formatOrderDate, parseOrderDate } from '../../src/utils/dates.js';
import { authErrorMessage } from '../../src/components/auth-form.js';
import { accountErrorText } from '../../src/components/account-view.js';
import { toAddress, toOrder, listOrders, updateAddress } from '../../src/api/account.js';
import {
  fromTechsphere,
  toAppError,
  toTechsphereBody,
  toTechsphereRequest,
} from '../../src/api/techsphere.js';

const NOW = Date.UTC(2026, 10, 12, 12, 0, 0);

/** A token shaped like the TechSphere API's (header.payload.signature, payload { sub, role, exp }). */
function techsphereToken(expSeconds) {
  const payload = Buffer.from(
    JSON.stringify({ sub: 'student@techsphere.test', role: 'shopper', exp: expSeconds }),
  ).toString('base64url');
  return `eyJhbGciOiJub25lIn0.${payload}.mock`;
}

/** Storage helpers over in-memory areas. */
function fakeStorage() {
  const areas = {};
  const area = () => {
    const data = new Map();
    return {
      data,
      getItem: (k) => (data.has(k) ? data.get(k) : null),
      setItem: (k, v) => data.set(k, String(v)),
      removeItem: (k) => data.delete(k),
    };
  };
  areas.local = area();
  areas.session = area();
  return { areas, storage: createStorage((a) => areas[a]) };
}

/** A fake http client that records requests and answers with `reply`. */
function fakeHttp(reply) {
  const calls = [];
  return {
    calls,
    request: async (method, path, init = {}) => (
      calls.push({ method, path, body: init.body }),
      reply(method, path)
    ),
  };
}

describe('JWT expiry', () => {
  it('reads exp from a TechSphere token', () => {
    const token = techsphereToken(NOW / 1000 + 3600);
    expect(decodeJwtPayload(token).sub).toBe('student@techsphere.test');
    expect(expiryOf(token, NOW)).toBe(NOW + 3600 * 1000);
  });
  it('falls back to expiresIn (BrandStore mock) or one hour; garbage is not a JWT', () => {
    expect(expiryOf('3f2c-uuid', NOW, 60)).toBe(NOW + 60000);
    expect(expiryOf('a.b.c', NOW)).toBe(NOW + 3600000);
    expect(decodeJwtPayload('not-a-token')).toBe(null);
  });
});

describe('session rules (pure)', () => {
  const active = {
    token: 't',
    expiresAt: NOW + 1000,
    user: { email: 'a@b.co', name: 'A', role: 'shopper' },
  };
  it('a session is active only before it expires', () => {
    expect([
      isActive(active, NOW),
      isActive(active, NOW + 1000),
      isActive(SIGNED_OUT, NOW),
    ]).toEqual([true, false, false]);
  });
  it('corrupted stored sessions mean signed out', () => {
    for (const bad of [
      null,
      'x',
      { token: 5 },
      { token: 't', expiresAt: 'soon', user: {} },
      { token: 't', expiresAt: 1 },
    ]) {
      expect(rehydrateSession(bad)).toEqual(SIGNED_OUT);
    }
  });
  it("the return page only allows this site's pages (no open redirect)", () => {
    expect(withFlags(rehydrateFlags(null), { returnTo: 'account.html' }).returnTo).toBe(
      'account.html',
    );
    expect(withFlags(rehydrateFlags(null), { returnTo: 'https://evil.example/' }).returnTo).toBe(
      '',
    );
    expect(withFlags(rehydrateFlags(null), { returnTo: '//evil.example' }).returnTo).toBe('');
  });
});

describe('session store: sign in, expiry, sign out keeps the cart', () => {
  it('signOut removes the session but not the cart or saved items', () => {
    const { areas, storage } = fakeStorage();
    let now = NOW;
    const cart = createCartStore(storage, { addEventListener: () => {} });
    cart.dispatch({
      type: 'add',
      product: {
        id: 'p-001',
        name: 'Nova',
        price: 100,
        currency: 'EGP',
        stock: 25,
        image: { url: '/x.svg', alt: '' },
      },
      quantity: 2,
    });
    const session = createSessionStore(storage, () => now);
    session.signIn({
      token: 'abc',
      expiresAt: NOW + 1000,
      user: { email: 'a@b.co', name: 'A', role: 'shopper' },
    });
    expect([session.isSignedIn(), session.token(), areas.session.data.has(KEYS.session)]).toEqual([
      true,
      'abc',
      true,
    ]);
    now = NOW + 2000;
    expect([session.isSignedIn(), session.isExpired(), session.token()]).toEqual([
      false,
      true,
      null,
    ]);
    session.signOut();
    expect([areas.session.data.has(KEYS.session), areas.local.data.has(KEYS.cart)]).toEqual([
      false,
      true,
    ]);
    expect(createCartStore(storage, { addEventListener: () => {} }).summary().itemCount).toBe(2);
  });
  it('the session lives in sessionStorage, never localStorage', () => {
    const { areas, storage } = fakeStorage();
    createSessionStore(storage).signIn({
      token: 'abc',
      expiresAt: Date.now() + 1000,
      user: { email: '', name: '', role: 'shopper' },
    });
    expect([areas.session.data.has(KEYS.session), areas.local.data.size]).toEqual([true, 0]);
  });
  it('flags are read once', () => {
    const { storage } = fakeStorage();
    const flags = createFlagsStore(storage);
    flags.remember({
      notice: 'Your session has expired. Please sign in again.',
      returnTo: 'account.html',
    });
    expect(flags.take()).toEqual({
      notice: 'Your session has expired. Please sign in again.',
      returnTo: 'account.html',
    });
    expect(flags.take()).toEqual({ notice: '', returnTo: '' });
  });
});

describe('auth API module', () => {
  it('sends credentials only in the JSON body, never in the path', async () => {
    const token = techsphereToken(NOW / 1000 + 3600);
    const http = fakeHttp(() => ({
      token,
      user: { email: 'student@techsphere.test', name: 'Test Student', role: 'shopper' },
    }));
    const session = await login(
      http,
      { email: ' student@techsphere.test ', password: 'Passw0rd!' },
      () => NOW,
    );
    expect(http.calls[0]).toEqual({
      method: 'POST',
      path: '/auth/login',
      body: { email: 'student@techsphere.test', password: 'Passw0rd!' },
    });
    expect([session.token, session.expiresAt, session.user.name]).toEqual([
      token,
      NOW + 3600000,
      'Test Student',
    ]);
    await register(http, { name: ' New ', email: 'n@b.co', password: 'longpassword' }, () => NOW);
    expect([http.calls[1].path, http.calls[1].body.name]).toEqual(['/auth/register', 'New']);
  });
  it('reads both API formats and refuses a response without a token', () => {
    expect(
      sessionFromResponse(
        { data: { token: 'uuid', expiresIn: 60, user: { email: 'e', name: 'n' } } },
        NOW,
      ).expiresAt,
    ).toBe(NOW + 60000);
    expect(() => sessionFromResponse({ user: {} }, NOW)).toThrow(/no token/);
  });
});

describe('form validation', () => {
  it('sign-in needs a valid email and a password', () => {
    expect(validateLogin({ email: '', password: '' }).map((e) => e.field)).toEqual([
      'email',
      'password',
    ]);
    expect(validateLogin({ email: 'student@techsphere.test', password: 'x' })).toEqual([]);
  });
  it('registration: name, email, 8+ character password, matching confirmation', () => {
    const errors = validateRegister({
      name: '',
      email: 'bad',
      password: 'short',
      confirm: 'other',
    });
    expect(errors.map((e) => e.field)).toEqual(['name', 'email', 'password', 'confirm']);
    expect(errors[3].message).toBe('The two passwords do not match.');
    expect(
      validateRegister({
        name: 'A',
        email: 'a@b.co',
        password: 'longenough',
        confirm: 'longenough',
      }),
    ).toEqual([]);
  });
  it('address: the city is required', () => {
    expect(validateAddress({ city: ' ', street: 'x' })).toEqual([
      { field: 'city', message: 'Enter the city.' },
    ]);
  });
});

describe('error wording keeps 400 and 401 apart', () => {
  it('401: wrong credentials, one message for both fields', () => {
    expect(
      authErrorMessage(new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials')),
    ).toEqual({
      general: 'The email or password is incorrect. Check them and try again.',
      fields: [],
    });
  });
  it('400: already registered goes on the email field; other 400s show the server message', () => {
    expect(
      authErrorMessage(new ApiError(400, 'EMAIL_TAKEN', 'Email already registered')).fields[0]
        .field,
    ).toBe('email');
    expect(
      authErrorMessage(
        new ApiError(400, 'VALIDATION_ERROR', 'Invalid email or password (min 8 characters)'),
      ).general,
    ).toContain('min 8 characters');
  });
  it('a refused cancel (409) is explained', () => {
    expect(
      accountErrorText(new ApiError(409, 'ORDER_NOT_CANCELLABLE', 'Order is shipped')),
    ).toContain('can no longer be cancelled');
  });
});

describe('order dates in every format the API sends', () => {
  it('reads ISO, day/month/year and "4 Aug 2026"', () => {
    expect(
      ['2026-08-01T10:15:00Z', '02/08/2026', '2026-08-03T18:40:00+03:00', '4 Aug 2026'].map(
        formatOrderDate,
      ),
    ).toEqual(['1 Aug 2026', '2 Aug 2026', '3 Aug 2026', '4 Aug 2026']);
  });
  it('keeps unreadable dates as text', () => {
    expect([parseOrderDate('31/02/2026'), formatOrderDate('soon')]).toEqual([null, 'soon']);
  });
});

describe('account data in one shape for both APIs', () => {
  it('TechSphere orders: offset paging, total in pounds, qty', () => {
    expect(toTechsphereRequest('/account/orders?limit=5&page=2')).toBe(
      '/account/orders?limit=5&offset=5',
    );
    const body = fromTechsphere('/account/orders?limit=5&offset=5', {
      items: [
        {
          id: 'o-006',
          items: [{ productId: 'p-006', qty: 2 }],
          total: 2999,
          status: 'processing',
          created_at: '02/08/2026',
        },
      ],
      offset: 5,
      limit: 5,
      total: 9,
    });
    expect(body.meta).toEqual({ page: 2, limit: 5, total: 9, totalPages: 2 });
    expect(toOrder(body.data[0])).toEqual({
      id: 'o-006',
      createdAt: '02/08/2026',
      status: 'processing',
      items: [{ productId: 'p-006', name: null, quantity: 2 }],
      total: 299900,
      currency: 'EGP',
      cancellable: true,
    });
  });
  it('TechSphere address PUT body has only city and street; errors get codes', () => {
    expect(
      toTechsphereBody('PUT', '/account/addresses/a-1', {
        city: 'Cairo',
        street: '9th',
        label: 'x',
        line1: '9th',
      }),
    ).toEqual({ city: 'Cairo', street: '9th' });
    expect(
      toAppError(400, '/auth/register', { error: 'Email already registered' }).error.code,
    ).toBe('EMAIL_TAKEN');
    expect(toAppError(401, '/auth/login', { error: 'Invalid credentials' }).error.code).toBe(
      'INVALID_CREDENTIALS',
    );
  });
  it('BrandStore addresses map line1 to street and keep the other fields on save', async () => {
    const stored = toAddress({
      id: 'home',
      label: 'Home',
      line1: '12 Nile St',
      city: 'Cairo',
      postalCode: '11511',
      country: 'EG',
    });
    expect([stored.street, stored.city]).toEqual(['12 Nile St', 'Cairo']);
    const http = fakeHttp(() => ({ data: { id: 'home', line1: '1 New St', city: 'Giza' } }));
    const saved = await updateAddress(http, { ...stored, street: '1 New St', city: 'Giza' });
    expect(http.calls[0].body).toEqual({
      label: 'Home',
      line1: '1 New St',
      city: 'Giza',
      postalCode: '11511',
      country: 'EG',
      street: '1 New St',
    });
    expect(saved.street).toBe('1 New St');
  });
  it('listOrders asks for a page and returns app-shape orders', async () => {
    const http = fakeHttp(() => ({
      data: [
        {
          id: 'o-1',
          createdAt: '2026-10-02T09:15:00Z',
          status: 'shipped',
          items: [{ productId: 'x', name: 'X', quantity: 1 }],
          total: 100,
          currency: 'USD',
          cancellable: false,
        },
      ],
      meta: { page: 1, limit: 5, total: 1, totalPages: 1 },
    }));
    const { data } = await listOrders(http, { page: 1, limit: 5 });
    expect([http.calls[0].path, data[0].cancellable]).toEqual([
      '/account/orders?limit=5&page=1',
      false,
    ]);
  });
});
