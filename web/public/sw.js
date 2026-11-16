/*
 * BrandStore service worker (Advanced Task 5). Rules, by request:
 *
 * | Request                                              | Strategy                         | Cache          |
 * |------------------------------------------------------|----------------------------------|----------------|
 * | /assets/<name>-<hash>.js|css|svg|… (Vite build)      | cache first (the name changes    | static-v1      |
 * |                                                      | whenever the content changes)    |                |
 * | Page navigations (/, /products, /products/p-001, …)  | network first, cached page or    | pages-v1       |
 * |                                                      | the app shell when offline       |                |
 * | Catalog API: GET /products, /products/:id,           | network first (prices and stock  | api-v1         |
 * |   /categories, without a token                       | must be fresh), cache offline    |                |
 * | Anything sent with an Authorization header (orders,  | network only, never stored       | -              |
 * |   account, admin, checkout)                          |                                  |                |
 * | POST/PATCH/PUT/DELETE                                | network only                     | -              |
 * | Other same-origin GETs (favicon, dev-server modules) | network first, cache offline     | pages-v1       |
 *
 * Cache names carry VERSION; `activate` deletes every cache of an older version.
 */
const VERSION = 'v1';
const STATIC_CACHE = `brandstore-static-${VERSION}`;
const PAGES_CACHE = `brandstore-pages-${VERSION}`;
const API_CACHE = `brandstore-api-${VERSION}`;
const CURRENT = [STATIC_CACHE, PAGES_CACHE, API_CACHE];
const HASHED = /\/assets\/.+-[A-Za-z0-9_-]{8,}\.(?:js|css|svg|png|webp|avif|woff2?)$/;
const CATALOG = /\/(?:products(?:\/[\w-]+)?|categories)$/;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.add('/'))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !CURRENT.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(STATIC_CACHE)).put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
    return response;
  } catch (error) {
    const cached =
      (await caches.match(request, { ignoreVary: true })) ||
      (fallbackUrl ? await caches.match(fallbackUrl) : undefined);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('Authorization')) return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  if (sameOrigin && HASHED.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
  } else if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGES_CACHE, '/'));
  } else if (CATALOG.test(url.pathname)) {
    // The TechSphere API (VITE_API_BASE, any origin): fresh when online, the last answer when offline.
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (sameOrigin && url.protocol.startsWith('http')) {
    event.respondWith(networkFirst(request, PAGES_CACHE));
  }
});
