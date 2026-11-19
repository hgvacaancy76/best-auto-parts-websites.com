// Zero-dependency static server. Usage: node serve.mjs [--port 3000] [--base /REPO-NAME/]
// --base serves the site under a sub-path, the way GitHub Pages serves a project site.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, def) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : def; };
const port = Number(arg('--port', 3000));
const base = ('/' + arg('--base', '/').replace(/^\/+|\/+$/g, '') + '/').replace('//', '/');
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json',
};
const blocked = /^\/(node_modules|build|content|\.work|\.git|private)\//;

http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (!url.startsWith(base)) { res.writeHead(404); return res.end('Not found'); }
  url = '/' + url.slice(base.length);
  if (blocked.test(url)) { res.writeHead(404); return res.end('Not found'); }
  let file = path.join(root, path.normalize(url));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    if (!url.endsWith('/')) { res.writeHead(301, { Location: base + url.slice(1) + '/' }); return res.end(); }
    file = path.join(file, 'index.html');
  }
  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': types['.html'] });
    return res.end(fs.readFileSync(path.join(root, '404.html')));
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`Serving ${root} at http://localhost:${port}${base}`));
