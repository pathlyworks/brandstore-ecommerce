/**
 * Zero-dependency static server (ES modules need http://, not file://).
 *   node scripts/serve.mjs            # serves the project root on http://127.0.0.1:8080
 *   node scripts/serve.mjs dist 4173  # serves the build output (npm run preview)
 * Unknown paths get 404.html with status 404, like Netlify.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

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
export function serve(dir = '.', port = 8080) {
  const root = resolve(dir);
  const server = createServer(async (req, res) => {
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { url } = await serve(
    process.argv[2] || '.',
    Number(process.argv[3] || process.env.PORT || 8080),
  );
  console.log(`Serving ${process.argv[2] || '.'} on ${url}`);
}
