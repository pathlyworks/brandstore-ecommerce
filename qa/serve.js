// Tiny static file server for the QA scripts. ES modules do not load from file:// URLs, so every
// check opens the site over http://127.0.0.1 instead. One server per process, started on first use;
// unref() lets the process exit when the checks finish.
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
  const ready = new Promise((resolve) => {
    const server = http.createServer((req, res) => {
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
  });
  servers.set(root, ready);
  return ready;
}

module.exports = { siteBase };
