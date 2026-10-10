// Tiny local web server for previewing the site. Run with: npm run dev
// Serves the site on http://localhost:3000 and runs api/contact.js so the form works locally too.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;

// Load a local .env file (if present) for the contact form keys.
try {
  for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && m[2] && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { /* no .env file: the form will report "not connected" */ }

const handler = createRequire(import.meta.url)(path.join(ROOT, 'api', 'contact.js'));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.mov': 'video/quicktime', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml', '.ico': 'image/x-icon',
};
const PUBLIC_DIRS = ['css', 'js', 'content', 'assets'];
const PUBLIC_FILES = ['index.html', 'robots.txt', 'sitemap.xml'];

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(body);
}
function notFound(res) {
  send(res, 404, fs.readFileSync(path.join(ROOT, '404.html')), TYPES['.html']);
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return send(res, 400, 'Bad request'); }

  if (pathname === '/api/contact') {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size > 50_000) req.destroy(); else chunks.push(c); });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      let body = raw;
      try { body = JSON.parse(raw); } catch { /* handler will reject */ }
      const out = Object.assign(res, {
        status(code) { res.statusCode = code; return res; },
        json(obj) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); },
      });
      Promise.resolve(handler({ method: req.method, body, headers: req.headers }, out))
        .catch((e) => { console.error(e); if (!res.writableEnded) { res.statusCode = 500; res.end('{"ok":false}'); } });
    });
    return;
  }

  if (pathname === '/') pathname = '/index.html';
  const rel = pathname.replace(/^\/+/, '');
  const top = rel.split('/')[0];
  const allowed = PUBLIC_FILES.includes(rel) || PUBLIC_DIRS.includes(top);
  const full = path.join(ROOT, rel);
  if (!allowed || !full.startsWith(ROOT + path.sep) || !fs.existsSync(full) || !fs.statSync(full).isFile()) return notFound(res);

  const type = TYPES[path.extname(full).toLowerCase()] || 'application/octet-stream';
  const stat = fs.statSync(full);
  const range = req.headers.range && /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if (range) { // lets <video> seek while previewing
    const start = range[1] ? parseInt(range[1], 10) : 0;
    const end = range[2] ? Math.min(parseInt(range[2], 10), stat.size - 1) : stat.size - 1;
    res.writeHead(206, { 'Content-Type': type, 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
    return fs.createReadStream(full, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  fs.createReadStream(full).pipe(res);
}).listen(PORT, () => {
  console.log(`\n  Portfolio running at  http://localhost:${PORT}\n  Press Ctrl+C to stop.\n`);
  if (!process.env.RESEND_API_KEY || !process.env.CONTACT_TO_EMAIL) {
    console.log('  Note: contact form email is not configured (see README). The form will say so honestly.\n');
  }
});
