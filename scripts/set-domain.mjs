// Fills in your real website address for social previews + search engines.
// Usage: npm run set-domain https://your-site.com
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv[2];
let origin;
try {
  const u = new URL(arg);
  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('bad protocol');
  origin = u.origin;
} catch {
  console.error('Usage: npm run set-domain https://your-site.com');
  process.exit(1);
}
const indexPath = path.join(ROOT, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
// Replace the placeholder, or a domain set previously.
html = html.replace(/(content|href)="https?:\/\/[^"/]+(\/(?:assets\/og-image\.png)?)"/g, (m, attr, rest) => `${attr}="${origin}${rest}"`);
fs.writeFileSync(indexPath, html);
fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${origin}/</loc></url>\n</urlset>\n`);
console.log(`Done. Site address set to ${origin} (index.html, robots.txt, sitemap.xml).`);
