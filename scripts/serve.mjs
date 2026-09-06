import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { root, publicFiles } from './site-files.mjs';
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const allowedFiles = new Set((await publicFiles()).map((file) => '/' + file));
http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://localhost:${port}`);
    const decoded = decodeURIComponent(url.pathname);
    const pathname = decoded.endsWith('/') ? decoded + 'index.html' : decoded;
    const target = path.resolve(root, pathname.slice(1));
    const relative = path.relative(root, target);
    const publicPath = '/' + relative.split(path.sep).join('/');
    if (relative.startsWith('..') || path.isAbsolute(relative) || !allowedFiles.has(publicPath)) {
      response.writeHead(404).end('Not found');
      return;
    }
    const content = await readFile(target);
    response.writeHead(200, { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Local: http://localhost:${port}`));
