/**
 * BrandStore mock API: a zero-dependency Node server that implements api/openapi.json.
 *
 *   node mock-server/server.mjs            # http://localhost:4010
 *   PORT=5000 RATE_LIMIT_MAX=100 node mock-server/server.mjs
 *
 * State lives in memory and is reset on restart (or by POST /__reset, a test hook that is
 * not part of the public contract). Responses always use the envelopes in the spec:
 * success = { data, meta? }, failure = { error: { code, message, details? } }.
 */
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import {
  BRANDS,
  CATEGORIES,
  PRODUCTS,
  detailsFor,
  USERS,
  seedAddresses,
  seedOrders,
} from './data.mjs';

const SORTS = ['price_asc', 'price_desc', 'rating_desc', 'name_asc'];
const ORDER_STATUSES = ['processing', 'shipped', 'delivered', 'cancelled'];
const TOKEN_TTL_SECONDS = 3600;
const LOGIN_MAX_FAILURES = 5;
const WINDOW_MS = 60_000;

/** Raised by handlers; turned into an error envelope by the router. */
class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const validation = (details) =>
  new HttpError(400, 'VALIDATION_ERROR', 'One or more fields are invalid.', details);

/** Creates one isolated API instance (its own data, sessions and rate-limit counters). */
export function createApp({ rateLimitMax = 60 } = {}) {
  let orders = seedOrders();
  let addresses = seedAddresses();
  let users = USERS.map((u) => ({ ...u })); // accounts created with POST /auth/register are added here
  const sessions = new Map(); // token -> { userId, expiresAt }
  const buckets = new Map(); // client key -> { count, resetAt }
  const loginFailures = new Map(); // email -> { count, resetAt }

  function reset() {
    orders = seedOrders();
    addresses = seedAddresses();
    users = USERS.map((u) => ({ ...u }));
    sessions.clear();
    buckets.clear();
    loginFailures.clear();
  }

  /** Fixed-window limiter keyed by X-Client-Id (if sent) or the remote address. */
  function rateLimit(req, res) {
    const key = req.headers['x-client-id'] || req.socket.remoteAddress;
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || b.resetAt <= now) {
      b = { count: 0, resetAt: now + WINDOW_MS };
      buckets.set(key, b);
    }
    b.count += 1;
    const remaining = Math.max(0, rateLimitMax - b.count);
    res.setHeader('X-RateLimit-Limit', String(rateLimitMax));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    if (b.count > rateLimitMax) {
      res.setHeader('Retry-After', String(Math.ceil((b.resetAt - now) / 1000)));
      throw new HttpError(429, 'RATE_LIMITED', 'Too many requests. Try again later.');
    }
  }

  function requireUser(req) {
    const header = req.headers.authorization || '';
    const match = /^Bearer (\S+)$/.exec(header);
    if (!match) throw new HttpError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
    const session = sessions.get(match[1]);
    if (!session || session.expiresAt <= Date.now()) {
      sessions.delete(match[1]);
      throw new HttpError(401, 'INVALID_TOKEN', 'Your session has expired. Sign in again.');
    }
    return users.find((u) => u.id === session.userId);
  }

  // ---- query helpers -------------------------------------------------------------------
  function intParam(q, name, { min, max, fallback }, errors) {
    if (!q.has(name)) return fallback;
    const raw = q.get(name);
    const n = Number(raw);
    if (!/^\d+$/.test(raw) || n < min || (max !== undefined && n > max)) {
      errors.push({
        field: name,
        message: `must be an integer from ${min}${max !== undefined ? ` to ${max}` : ' up'}`,
      });
      return fallback;
    }
    return n;
  }

  function paginate(list, page, limit) {
    const total = list.length;
    return {
      data: list.slice((page - 1) * limit, page * limit),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  // ---- handlers ------------------------------------------------------------------------
  function listProducts(q) {
    const errors = [];
    const page = intParam(q, 'page', { min: 1, fallback: 1 }, errors);
    const limit = intParam(q, 'limit', { min: 1, max: 50, fallback: 12 }, errors);
    const minPrice = intParam(q, 'minPrice', { min: 0, fallback: null }, errors);
    const maxPrice = intParam(q, 'maxPrice', { min: 0, fallback: null }, errors);
    const category = q.get('category');
    const sort = q.get('sort');
    const search = q.get('q');
    const inStock = q.get('inStock');
    const brand = q.get('brand');
    const minRatingRaw = q.get('minRating');
    const minRating = minRatingRaw === null ? null : Number(minRatingRaw);
    if (brand !== null && !BRANDS.includes(brand))
      errors.push({ field: 'brand', message: `must be one of ${BRANDS.join(', ')}` });
    if (minRatingRaw !== null && (!/^\d(\.\d)?$/.test(minRatingRaw) || minRating > 5))
      errors.push({ field: 'minRating', message: 'must be a number from 0 to 5 (one decimal)' });
    if (category !== null && !CATEGORIES.includes(category))
      errors.push({ field: 'category', message: `must be one of ${CATEGORIES.join(', ')}` });
    if (sort !== null && !SORTS.includes(sort))
      errors.push({ field: 'sort', message: `must be one of ${SORTS.join(', ')}` });
    if (search !== null && (search.trim() === '' || search.length > 100))
      errors.push({ field: 'q', message: 'must be 1 to 100 characters' });
    if (inStock !== null && inStock !== 'true' && inStock !== 'false')
      errors.push({ field: 'inStock', message: 'must be true or false' });
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice)
      errors.push({ field: 'minPrice', message: 'must not be greater than maxPrice' });
    if (errors.length) throw validation(errors);

    let list = PRODUCTS.filter(
      (p) =>
        (!category || p.category === category) &&
        (!brand || p.brand === brand) &&
        (minRating === null || p.rating >= minRating) &&
        (!search || p.name.toLowerCase().includes(search.trim().toLowerCase())) &&
        (minPrice === null || p.price >= minPrice) &&
        (maxPrice === null || p.price <= maxPrice) &&
        (inStock === null || (inStock === 'true') === p.stock > 0),
    );
    const compare = {
      price_asc: (a, b) => a.price - b.price,
      price_desc: (a, b) => b.price - a.price,
      rating_desc: (a, b) => b.rating - a.rating,
      name_asc: (a, b) => a.name.localeCompare(b.name),
    }[sort];
    if (compare) list = [...list].sort(compare);
    return [200, paginate(list, page, limit)];
  }

  function getProduct(id) {
    if (!/^[a-z0-9-]{1,64}$/.test(id))
      throw validation([{ field: 'id', message: 'must be lowercase letters, digits and dashes' }]);
    const p = PRODUCTS.find((x) => x.id === id);
    if (!p) throw new HttpError(404, 'NOT_FOUND', `Product "${id}" was not found.`);
    return [200, { data: { ...p, ...detailsFor(p) } }];
  }

  function login(body) {
    const errors = [];
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push({ field: 'email', message: 'must be a valid email address' });
    if (typeof body.password !== 'string' || body.password.length === 0)
      errors.push({ field: 'password', message: 'is required' });
    if (errors.length) throw validation(errors);

    const now = Date.now();
    const f = loginFailures.get(email);
    if (f && f.resetAt > now && f.count >= LOGIN_MAX_FAILURES) {
      throw Object.assign(
        new HttpError(429, 'TOO_MANY_LOGIN_ATTEMPTS', 'Too many failed sign-in attempts.'),
        { retryAfter: Math.ceil((f.resetAt - now) / 1000) },
      );
    }
    const user = users.find((u) => u.email === email && u.password === body.password);
    if (!user) {
      const next = f && f.resetAt > now ? f : { count: 0, resetAt: now + WINDOW_MS };
      next.count += 1;
      loginFailures.set(email, next);
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    loginFailures.delete(email);
    const token = randomUUID();
    sessions.set(token, { userId: user.id, expiresAt: now + TOKEN_TTL_SECONDS * 1000 });
    return [
      200,
      {
        data: {
          token,
          tokenType: 'Bearer',
          expiresIn: TOKEN_TTL_SECONDS,
          user: { id: user.id, name: user.name, email: user.email },
        },
      },
    ];
  }

  /** A new session for a user (token, expiry). */
  function issueSession(user) {
    const token = randomUUID();
    sessions.set(token, { userId: user.id, expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000 });
    return {
      token,
      tokenType: 'Bearer',
      expiresIn: TOKEN_TTL_SECONDS,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  function register(body) {
    const errors = [];
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push({ field: 'email', message: 'must be a valid email address' });
    if (typeof body.password !== 'string' || body.password.length < 8)
      errors.push({ field: 'password', message: 'must be at least 8 characters' });
    if (name.length > 80) errors.push({ field: 'name', message: 'must be at most 80 characters' });
    if (errors.length) throw validation(errors);
    if (users.some((u) => u.email === email))
      throw new HttpError(400, 'EMAIL_TAKEN', 'Email already registered.');
    const user = {
      id: `u-${users.length + 1}`,
      name: name || email,
      email,
      password: body.password,
    };
    users.push(user);
    return [201, { data: issueSession(user) }];
  }

  function listOrders(user, q) {
    const errors = [];
    const page = intParam(q, 'page', { min: 1, fallback: 1 }, errors);
    const limit = intParam(q, 'limit', { min: 1, max: 20, fallback: 10 }, errors);
    const status = q.get('status');
    if (status !== null && !ORDER_STATUSES.includes(status))
      errors.push({ field: 'status', message: `must be one of ${ORDER_STATUSES.join(', ')}` });
    if (errors.length) throw validation(errors);
    const mine = orders
      .filter((o) => o.userId === user.id && (!status || o.status === status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(publicOrder);
    return [200, paginate(mine, page, limit)];
  }

  function cancelOrder(user, id, body) {
    if (body.reason !== undefined && (typeof body.reason !== 'string' || body.reason.length > 200))
      throw validation([
        { field: 'reason', message: 'must be a string of at most 200 characters' },
      ]);
    const o = orders.find((x) => x.id === id && x.userId === user.id);
    if (!o) throw new HttpError(404, 'NOT_FOUND', `Order "${id}" was not found.`);
    if (o.status !== 'processing')
      throw new HttpError(
        400,
        'ORDER_NOT_CANCELLABLE',
        `Order "${id}" is ${o.status} and can no longer be cancelled.`,
      );
    o.status = 'cancelled';
    o.cancelledAt = new Date().toISOString();
    o.cancelReason = body.reason ?? null;
    return [200, { data: publicOrder(o) }];
  }

  function publicOrder(o) {
    const { userId: _userId, ...rest } = o;
    return {
      ...rest,
      cancellable: o.status === 'processing',
      cancelledAt: rest.cancelledAt ?? null,
      cancelReason: rest.cancelReason ?? null,
    };
  }

  const ADDRESS_RULES = {
    label: [/^.{1,40}$/, 'must be 1 to 40 characters'],
    fullName: [/^.{1,80}$/, 'must be 1 to 80 characters'],
    line1: [/^.{1,120}$/, 'must be 1 to 120 characters'],
    city: [/^.{1,60}$/, 'must be 1 to 60 characters'],
    postalCode: [/^[A-Za-z0-9 -]{3,10}$/, 'must be 3 to 10 letters, digits, spaces or dashes'],
    country: [/^[A-Z]{2}$/, 'must be a 2-letter ISO country code, e.g. EG'],
  };

  function putAddress(user, id, body) {
    const errors = [];
    if (!/^[a-z0-9-]{1,40}$/.test(id))
      errors.push({ field: 'id', message: 'must be 1 to 40 lowercase letters, digits or dashes' });
    if (body.id !== undefined && body.id !== id)
      errors.push({ field: 'id', message: 'must match the id in the URL' });
    for (const [field, [re, message]] of Object.entries(ADDRESS_RULES)) {
      if (typeof body[field] !== 'string' || !re.test(body[field].trim()))
        errors.push({ field, message });
    }
    for (const field of ['line2', 'phone']) {
      if (body[field] !== undefined && body[field] !== null && typeof body[field] !== 'string')
        errors.push({ field, message: 'must be a string or null' });
    }
    if (body.isDefault !== undefined && typeof body.isDefault !== 'boolean')
      errors.push({ field: 'isDefault', message: 'must be true or false' });
    if (errors.length) throw validation(errors);

    const address = {
      id,
      label: body.label.trim(),
      fullName: body.fullName.trim(),
      line1: body.line1.trim(),
      line2: body.line2 ?? null,
      city: body.city.trim(),
      postalCode: body.postalCode.trim(),
      country: body.country,
      phone: body.phone ?? null,
      isDefault: body.isDefault === true || addresses.length === 0,
    };
    if (address.isDefault) addresses = addresses.map((a) => ({ ...a, isDefault: false }));
    const existing = addresses.findIndex((a) => a.id === id);
    if (existing >= 0) {
      addresses[existing] = address;
      return [200, { data: address }];
    }
    addresses.push(address);
    return [201, { data: address }, { Location: `/account/addresses/${id}` }];
  }

  function deleteAddress(user, id) {
    const i = addresses.findIndex((a) => a.id === id);
    if (i < 0) throw new HttpError(404, 'NOT_FOUND', `Address "${id}" was not found.`);
    const [removed] = addresses.splice(i, 1);
    if (removed.isDefault && addresses.length) addresses[0] = { ...addresses[0], isDefault: true };
    return [200, { data: { id, deleted: true } }];
  }

  /**
   * Mock-only test hook (not part of the public contract): a request with header
   * X-Mock-Status: 400 | 404 | 429 | 500 fails with that status, so the client's error states can be
   * demonstrated and tested on demand.
   */
  function simulateFailure(req) {
    const wanted = req.headers['x-mock-status'];
    if (!wanted) return;
    const failures = {
      400: ['VALIDATION_ERROR', 'One or more fields are invalid.'],
      404: ['NOT_FOUND', 'The requested resource was not found.'],
      429: ['RATE_LIMITED', 'Too many requests. Try again later.'],
      500: ['INTERNAL', 'Unexpected error.'],
    };
    if (!failures[wanted]) return;
    const err = new HttpError(Number(wanted), ...failures[wanted]);
    if (wanted === '429') err.retryAfter = 5;
    throw err;
  }

  /** Mock-only test hook: X-Mock-Delay: <ms> (max 5000) delays the response, to show loading states and races. */
  function simulateDelay(req) {
    const ms = Math.min(Number(req.headers['x-mock-delay']) || 0, 5000);
    return ms > 0 ? new Promise((done) => setTimeout(done, ms)) : Promise.resolve();
  }

  // ---- routing -------------------------------------------------------------------------
  /** [method, pattern, needsAuth, handler(ctx)] */
  const routes = [
    ['GET', /^\/products$/, false, (c) => listProducts(c.query)],
    ['GET', /^\/products\/([^/]+)$/, false, (c) => getProduct(c.params[0])],
    ['POST', /^\/auth\/login$/, false, (c) => login(c.body)],
    ['POST', /^\/auth\/register$/, false, (c) => register(c.body)],
    ['GET', /^\/account\/orders$/, true, (c) => listOrders(c.user, c.query)],
    [
      'PATCH',
      /^\/account\/orders\/([^/]+)\/cancel$/,
      true,
      (c) => cancelOrder(c.user, c.params[0], c.body),
    ],
    ['GET', /^\/account\/addresses$/, true, () => [200, { data: addresses }]],
    [
      'PUT',
      /^\/account\/addresses\/([^/]+)$/,
      true,
      (c) => putAddress(c.user, c.params[0], c.body),
    ],
    ['DELETE', /^\/account\/addresses\/([^/]+)$/, true, (c) => deleteAddress(c.user, c.params[0])],
  ];

  async function readJson(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const text = Buffer.concat(chunks).toString('utf8');
    if (!text) return {};
    try {
      const value = JSON.parse(text);
      if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error();
      return value;
    } catch {
      throw new HttpError(400, 'INVALID_JSON', 'The request body must be a JSON object.');
    }
  }

  function send(res, status, body, headers = {}) {
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
    if (body === undefined) {
      res.writeHead(status).end();
      return;
    }
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(body));
  }

  async function handle(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Authorization, Content-Type, X-Client-Id, X-Mock-Status, X-Mock-Delay',
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining, Location',
    );
    const url = new URL(req.url, 'http://mock.local');
    try {
      if (req.method === 'OPTIONS') return send(res, 204);
      if (req.method === 'POST' && url.pathname === '/__reset') {
        reset();
        return send(res, 204);
      }
      rateLimit(req, res);
      await simulateDelay(req);
      simulateFailure(req);
      const matching = routes.filter(([, re]) => re.test(url.pathname));
      if (!matching.length) throw new HttpError(404, 'NOT_FOUND', `No route for ${url.pathname}.`);
      const route = matching.find(([m]) => m === req.method);
      if (!route) {
        res.setHeader('Allow', matching.map(([m]) => m).join(', '));
        throw new HttpError(405, 'METHOD_NOT_ALLOWED', `${req.method} is not allowed here.`);
      }
      const [, re, needsAuth, handler] = route;
      const ctx = {
        query: url.searchParams,
        params: re.exec(url.pathname).slice(1).map(decodeURIComponent),
        user: needsAuth ? requireUser(req) : null,
        body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readJson(req) : {},
      };
      const [status, body, headers] = handler(ctx);
      return send(res, status, body, headers);
    } catch (err) {
      if (!(err instanceof HttpError)) {
        console.error(err);
        return send(res, 500, { error: { code: 'INTERNAL', message: 'Unexpected error.' } });
      }
      if (err.status === 401) res.setHeader('WWW-Authenticate', 'Bearer');
      if (err.retryAfter) res.setHeader('Retry-After', String(err.retryAfter));
      const error = { code: err.code, message: err.message };
      if (err.details) error.details = err.details;
      return send(res, err.status, { error });
    }
  }

  return { handle, reset };
}

/** Starts a server; resolves with { url, close }. Used by the CLI below and by scripts/contract.mjs. */
export function start({ port = 4010, rateLimitMax } = {}) {
  const app = createApp({ rateLimitMax });
  const server = createServer((req, res) => app.handle(req, res));
  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const { port: actual } = server.address();
      resolve({ url: `http://127.0.0.1:${actual}`, close: () => server.close() });
    });
  });
}

// No top-level await here: vite.config.js imports this file, and Vite bundles the config as CommonJS
// (package.json has no "type": "module"), where top-level await is a build error and `npm run dev` cannot start.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  start({
    port: Number(process.env.PORT || 4010),
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 60),
  }).then(({ url }) => {
    console.log(
      `BrandStore mock API listening on ${url}  (demo login: demo@brandstore.test / Passw0rd!)`,
    );
  });
}
