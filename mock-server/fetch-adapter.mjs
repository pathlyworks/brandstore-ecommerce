/**
 * Runs the mock API behind a Fetch-style handler: (Request) => Promise<Response>.
 * Used by the Netlify function (netlify/functions/api.mjs) so the deployed site has the same API on
 * /api/* as `npm run start`. The mock was written for Node's http (req, res); this file passes it a
 * minimal req/res pair built from the Request and collects the result into a Response.
 */
import { createApp } from './server.mjs';

/**
 * @param {{ prefix?: string, rateLimitMax?: number }} [options]
 * @returns {(request: Request, clientIp?: string) => Promise<Response>}
 */
export function createFetchHandler({ prefix = '/api', rateLimitMax = 60 } = {}) {
  const app = createApp({ rateLimitMax });
  return async function handleFetch(request, clientIp = 'unknown') {
    const url = new URL(request.url);
    const hasBody = !['GET', 'HEAD'].includes(request.method);
    const body = hasBody ? Buffer.from(await request.arrayBuffer()) : Buffer.alloc(0);
    const req = {
      method: request.method,
      url: url.pathname.replace(new RegExp(`^${prefix}`), '') + url.search,
      headers: Object.fromEntries([...request.headers].map(([k, v]) => [k.toLowerCase(), v])),
      socket: { remoteAddress: clientIp },
      async *[Symbol.asyncIterator]() {
        if (body.length) yield body;
      },
    };
    return new Promise((resolve) => {
      const headers = new Headers();
      let status = 200;
      const res = {
        setHeader: (name, value) => headers.set(name, value),
        writeHead(code, extra = {}) {
          status = code;
          Object.entries(extra).forEach(([name, value]) => headers.set(name, value));
          return res;
        },
        end(chunk) {
          resolve(new Response(status === 204 ? null : (chunk ?? null), { status, headers }));
        },
      };
      app.handle(req, res);
    });
  };
}
