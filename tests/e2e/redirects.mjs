// Old transenigma.com addresses → new pages (S10), checked against real Apache with the production build.
// Also: SPA pages, robots.txt and sitemap.xml are served. No browser needed, creates no rows.
// Usage: npm run build, then  node tests/e2e/redirects.mjs [base]
//   base defaults to XAMPP serving this project's dist/ (http://localhost/<folder>/dist); after deploy, pass
//   https://transenigma.com to check the live site.
import path from 'node:path';

const base = (process.argv[2] ?? `http://localhost/${path.basename(path.resolve(import.meta.dirname, '../..'))}/dist`).replace(/\/$/, '');
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}`);
  if (!ok) failures++;
};

const REDIRECTS = [
  ['/index', '/'], ['/index.php', '/'],
  ['/portfolio', '/consultancy'], ['/portfolio.php', '/consultancy'], ['/services', '/consultancy'], ['/services.php', '/consultancy'],
  ['/mvppoc', '/consultancy'], ['/mvppoc.php', '/consultancy'],
  ['/enterprise', '/consultancy#enterprise'], ['/enterprise.php', '/consultancy#enterprise'], ['/Enterprise.PHP', '/consultancy#enterprise'],
  ['/webmobile', '/consultancy#web-mobile'], ['/webmobile.php', '/consultancy#web-mobile'], ['/webmobile/', '/consultancy#web-mobile'],
  ['/iot', '/consultancy#iot'], ['/iot.php', '/consultancy#iot'],
  ['/research.php', '/research'], ['/consultancy.php', '/consultancy'], ['/contact.php', '/contact'],
  ['/team.php', '/team'], ['/about', '/team'], ['/about.php', '/team'],
  ['/workshop', '/'], ['/workshop/', '/'], ['/workshop/solution-tech/', '/'], ['/workshop/science-research/', '/'], ['/workshops', '/'],
];

for (const [from, to] of REDIRECTS) {
  const res = await fetch(base + from, { redirect: 'manual' });
  const loc = res.headers.get('location') ?? '';
  // Locally the site lives in a sub-folder, so compare the path after the host.
  const target = loc.replace(/^https?:\/\/[^/]+/, '');
  check(res.status === 301 && target === to, `${from} → 301 ${to}${res.status !== 301 || target !== to ? ` (got ${res.status} ${loc})` : ''}`);
}

// New pages (same paths as the old site where they overlap) are served by the app, not redirected.
for (const p of ['/', '/research', '/consultancy', '/contact', '/team', '/factors/A', '/test']) {
  const res = await fetch(base + p, { redirect: 'manual' });
  const html = await res.text();
  check(res.status === 200 && html.includes('<div id="root">'), `${p} → 200 app page`);
}

const robots = await fetch(`${base}/robots.txt`);
const robotsText = await robots.text();
check(robots.status === 200 && robotsText.includes('Disallow: /admin') && robotsText.includes('Sitemap: https://transenigma.com/sitemap.xml'), 'robots.txt served with private areas and sitemap');
const sitemap = await fetch(`${base}/sitemap.xml`);
const sitemapText = await sitemap.text();
check(sitemap.status === 200 && (sitemapText.match(/<url>/g) ?? []).length === 12 && sitemapText.includes('<loc>https://transenigma.com/consultancy</loc>'), 'sitemap.xml lists the 12 public pages');

console.log(failures ? `\n${failures} check(s) failed` : '\nAll redirect checks passed');
process.exit(failures ? 1 : 0);
