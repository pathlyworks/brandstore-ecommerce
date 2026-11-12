/**
 * Zero-dependency static server (ES modules need http://, not file://).
 *   node scripts/serve.mjs            # serves the project root on http://127.0.0.1:8080
 *   node scripts/serve.mjs dist 4173  # serves the build output (npm run preview)
 * Unknown paths get 404.html with status 404, like Netlify.
 * Requests to /api/* go to the mock API (mock-server/server.mjs) in the same process, so the site and
 * the API share one origin, exactly like the Netlify function in production (netlify/functions/api.mjs).
 * API_RATE_LIMIT sets the mock's requests-per-minute limit (default 60, as in the spec).
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApp } from '../mock-server/server.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

/** Resolve a URL path to a file under root, or null. */
async function findFile(root, urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const file = resolve(join(root, clean.endsWith('/') ? `${clean}index.html` : clean));
  if (!file.startsWith(root + sep) || file.includes(`${sep}.git`)) return null;
  try {
    return (await stat(file)).isFile() ? file : null;
  } catch {
    return null;
  }
}

/** Start serving `dir`; resolves with { url, close }. */
export function serve(
  dir = '.',
  port = 8080,
  { apiRateLimit = Number(process.env.API_RATE_LIMIT || 60) } = {},
) {
  const root = resolve(dir);
  const api = createApp({ rateLimitMax: apiRateLimit });
  const server = createServer(async (req, res) => {
    if (req.url.startsWith('/api/')) {
      req.url = req.url.slice(4);
      return api.handle(req, res);
    }
    const file = await findFile(root, req.url);
    const target = file || join(root, '404.html');
    const body = await readFile(target).catch(() => Buffer.from('Not found'));
    res.writeHead(file ? 200 : 404, {
      'Content-Type': TYPES[extname(target)] || 'application/octet-stream',
    });
    res.end(body);
  });
  return new Promise((done) => {
    server.listen(port, '127.0.0.1', () => {
      done({ url: `http://127.0.0.1:${server.address().port}`, close: () => server.close() });
    });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { url } = await serve(
    process.argv[2] || '.',
    Number(process.argv[3] || process.env.PORT || 8080),
  );
  console.log(`Serving ${process.argv[2] || '.'} on ${url}`);
}
