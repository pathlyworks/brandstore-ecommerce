/** Unit tests for the http client (with a fake fetch) and the URL-backed catalog state. */
import { describe, expect, it } from 'vitest';
import { createHttpClient } from '../../src/api/http.js';
import { createCatalogState } from '../../src/state/catalog.js';

/** A fetch stand-in that records requests and answers with the given status and body. */
function fakeFetch(status, body, headers = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return new Response(body === undefined ? '' : JSON.stringify(body), { status, headers });
  };
  return { calls, fetchImpl };
}

describe('createHttpClient', () => {
  it('prefixes the base URL and returns the JSON body', async () => {
    const { calls, fetchImpl } = fakeFetch(200, { data: [] });
    const http = createHttpClient({ baseUrl: '/api', fetchImpl });
    expect(await http.get('/products?page=1')).toEqual({ data: [] });
    expect(calls[0].url).toBe('/api/products?page=1');
  });
  it('turns an error body into ApiError with status, code, details and Retry-After', async () => {
    const { fetchImpl } = fakeFetch(
      429,
      { error: { code: 'RATE_LIMITED', message: 'Slow down' } },
      { 'Retry-After': '7' },
    );
    const http = createHttpClient({ baseUrl: '', fetchImpl });
    let caught;
    await http.get('/products').catch((e) => {
      caught = e;
    });
    expect([caught.name, caught.status, caught.code, caught.retryAfter]).toEqual([
      'ApiError',
      429,
      'RATE_LIMITED',
      7,
    ]);
  });
  it('reports a network failure as status 0', async () => {
    const http = createHttpClient({
      baseUrl: '',
      fetchImpl: () => Promise.reject(new TypeError('offline')),
    });
    let caught;
    await http.get('/products').catch((e) => {
      caught = e;
    });
    expect([caught.status, caught.code]).toEqual([0, 'NETWORK']);
  });
  it('re-throws an abort so the caller can ignore it', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = () => Promise.reject(new DOMException('aborted', 'AbortError'));
    const http = createHttpClient({ baseUrl: '', fetchImpl });
    let caught;
    await http.get('/products', { signal: controller.signal }).catch((e) => {
      caught = e;
    });
    expect(caught.name).toBe('AbortError');
  });
});

/** Minimal location/history/window for the catalog state. */
function fakeBrowser(search = '') {
  const listeners = {};
  const location = { pathname: '/catalog.html', search, hash: '' };
  const entries = [];
  const history = {
    pushState: (_s, _t, url) => {
      entries.push(['push', url]);
      location.search = url.slice(url.indexOf('?') >= 0 ? url.indexOf('?') : url.length);
    },
    replaceState: (_s, _t, url) => {
      entries.push(['replace', url]);
      location.search = url.slice(url.indexOf('?') >= 0 ? url.indexOf('?') : url.length);
    },
  };
  const win = {
    addEventListener: (type, fn) => (listeners[type] = fn),
    removeEventListener: () => {},
  };
  return { location, history, win, entries, popstate: () => listeners.popstate() };
}

describe('createCatalogState', () => {
  it('starts from the URL (reload-safe)', () => {
    const b = fakeBrowser('?brand=Hearth&page=2');
    const state = createCatalogState(b.location, b.history, b.win);
    expect([state.get().brand, state.get().page]).toEqual(['Hearth', 2]);
  });
  it('writes each change to the URL and resets the page for filter changes', () => {
    const b = fakeBrowser('?page=2');
    const state = createCatalogState(b.location, b.history, b.win);
    state.update({ category: 'apparel' });
    expect(b.entries).toEqual([['push', '/catalog.html?category=apparel']]);
    state.update({ q: 'wool' }, { replace: true });
    expect(b.entries[1]).toEqual(['replace', '/catalog.html?category=apparel&q=wool']);
  });
  it('does not add a history entry when nothing changed', () => {
    const b = fakeBrowser('?category=apparel');
    const state = createCatalogState(b.location, b.history, b.win);
    state.update({ category: 'apparel' });
    expect(b.entries).toEqual([]);
  });
  it('follows Back/Forward and notifies listeners', () => {
    const b = fakeBrowser('?category=apparel');
    const state = createCatalogState(b.location, b.history, b.win);
    const seen = [];
    state.onChange((q) => seen.push(q.category));
    b.location.search = '?category=electronics';
    b.popstate();
    expect(seen).toEqual(['electronics']);
  });
});
