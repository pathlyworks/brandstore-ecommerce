/**
 * tests/support/browser/msw.js — the part of Mock Service Worker's API the tests in tests/dom/ use
 * (http.get/post, HttpResponse.json, setupServer with listen/use/resetHandlers/close), for running
 * them in a real browser with no installed packages (npm run test:browser). It patches fetch and
 * XMLHttpRequest (Axios uses XHR) in the page, the same two interceptors msw/node installs in jsdom.
 * An unhandled request is an error, as with onUnhandledRequest: 'error'.
 */
export class HttpResponse extends Response {
  static json(body, init = {}) {
    const headers = new Headers(init.headers);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    return new Response(JSON.stringify(body), { ...init, headers });
  }
}

function handler(method, path, resolver) {
  const names = [];
  const source = path
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:(\w+)/g, (_, name) => (names.push(name), '([^/]+)'));
  return { method, pattern: new RegExp(`^${source}$`), names, resolver };
}

export const http = {
  get: (path, resolver) => handler('GET', path, resolver),
  post: (path, resolver) => handler('POST', path, resolver),
  put: (path, resolver) => handler('PUT', path, resolver),
  delete: (path, resolver) => handler('DELETE', path, resolver),
  patch: (path, resolver) => handler('PATCH', path, resolver),
};

export const unhandled = [];

export function setupServer(...initial) {
  let runtime = [];
  const original = { fetch: window.fetch, XHR: window.XMLHttpRequest };

  async function respond(request) {
    const url = new URL(request.url);
    const target = url.origin + url.pathname;
    for (const h of [...runtime, ...initial]) {
      const m = h.method === request.method && target.match(h.pattern);
      if (!m) continue;
      const params = Object.fromEntries(h.names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      const response = await h.resolver({ request, params });
      if (response) return response;
    }
    unhandled.push(`${request.method} ${request.url}`);
    console.error(`[MSW] Error: unhandled request ${request.method} ${request.url}`);
    throw new TypeError('Failed to fetch');
  }

  async function fakeFetch(input, init) {
    const request = new Request(input, init);
    await Promise.resolve();
    if (request.signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError');
    return respond(request);
  }

  class FakeXHR extends EventTarget {
    constructor() {
      super();
      this.readyState = 0;
      this.status = 0;
      this.statusText = '';
      this.responseText = '';
      this.response = '';
      this.responseType = '';
      this.responseURL = '';
      this.timeout = 0;
      this.withCredentials = false;
      this.upload = new EventTarget();
      this.headers = {};
      this.responseHeaders = new Headers();
      this.aborted = false;
    }
    open(method, url) {
      this.method = method.toUpperCase();
      this.url = new URL(url, location.href).href;
      this.readyState = 1;
    }
    setRequestHeader(name, value) {
      this.headers[name] = value;
    }
    getAllResponseHeaders() {
      return [...this.responseHeaders].map(([k, v]) => `${k}: ${v}\r\n`).join('');
    }
    getResponseHeader(name) {
      return this.responseHeaders.get(name);
    }
    abort() {
      this.aborted = true;
      this.fire('abort');
    }
    fire(type) {
      this[`on${type}`]?.(new Event(type));
      this.dispatchEvent(new Event(type));
    }
    async send(body) {
      const request = new Request(this.url, {
        method: this.method,
        headers: this.headers,
        body: ['GET', 'HEAD'].includes(this.method) ? undefined : body,
      });
      let response;
      try {
        response = await respond(request);
      } catch {
        if (this.aborted) return;
        this.readyState = 4;
        this.fire('error');
        this.fire('loadend');
        return;
      }
      if (this.aborted) return;
      const text = await response.text();
      this.status = response.status;
      this.statusText = response.statusText;
      this.responseHeaders = response.headers;
      this.responseURL = this.url;
      this.responseText = text;
      this.response = this.responseType === 'json' ? JSON.parse(text || 'null') : text;
      this.readyState = 4;
      this.fire('readystatechange');
      this.fire('load');
      this.fire('loadend');
    }
  }

  return {
    listen() {
      window.fetch = fakeFetch;
      window.XMLHttpRequest = FakeXHR;
    },
    use: (...more) => (runtime = [...more, ...runtime]),
    resetHandlers: () => (runtime = []),
    close() {
      window.fetch = original.fetch;
      window.XMLHttpRequest = original.XHR;
    },
  };
}
