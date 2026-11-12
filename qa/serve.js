// Tiny static file server for the QA scripts. ES modules do not load from file:// URLs, so every
// check opens the site over http://127.0.0.1 instead. One server per process, started on first use;
// unref() lets the process exit when the checks finish. /api/* is served by the mock API.
const http = require('http');
const fs = require('fs');
const path = require('path');

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml',
  '.txt': 'text/plain', '.webp': 'image/webp', '.ico': 'image/x-icon',
};
const servers = new Map();

/** Returns the base URL (no trailing slash) of a server for `root`. */
function siteBase(root) {
  if (servers.has(root)) return servers.get(root);
  const ready = import(require('url').pathToFileURL(path.join(root, 'mock-server', 'server.mjs')).href).then(({ createApp }) => new Promise((resolve) => {
    const api = createApp({ rateLimitMax: 100000 }); // the mock API on /api, same origin as the site
    const server = http.createServer((req, res) => {
      if (req.url.startsWith('/api/')) { req.url = req.url.slice(4); return api.handle(req, res); }
      let u = decodeURIComponent(req.url.split('?')[0]);
      if (u.endsWith('/')) u += 'index.html';
      const f = path.join(root, u);
      if (!f.startsWith(root) || !fs.existsSync(f) || !fs.statSync(f).isFile()) {
        res.writeHead(404, { 'Content-Type': TYPES['.html'] });
        return res.end(fs.readFileSync(path.join(root, '404.html')));
      }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      res.end(fs.readFileSync(f));
    });
    server.listen(0, '127.0.0.1', () => { server.unref(); resolve('http://127.0.0.1:' + server.address().port); });
  }));
  servers.set(root, ready);
  return ready;
}

module.exports = { siteBase };
