// Per-page titles, descriptions, canonical URLs and robots rules (S10), on direct loads and in-app navigation.
// Read-only: creates no database rows. Usage (dev server running): node tests/e2e/page-meta.mjs
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}`);
  if (!ok) failures++;
};

const PUBLIC = [
  ['/', 'Transenigma — Research, Technology & Well-Being'],
  ['/research', 'Research — Trans Enigma Research Foundation | Transenigma'],
  ['/consultancy', 'Consultancy | Transenigma'],
  ['/team', 'Our Team | Transenigma'],
  ['/contact', 'Contact | Transenigma'],
  ['/test', 'Free 16PF Personality Test | Transenigma'],
  ['/how-it-works', 'How the 16PF Test Works | Transenigma'],
  ['/factors', 'The 16 Personality Factors | Transenigma'],
  ['/benefits', 'Benefits of the 16PF Test | Transenigma'],
  ['/faq', 'FAQ | Transenigma'],
  ['/privacy', 'Privacy Policy | Transenigma'],
  ['/terms', 'Terms of Service | Transenigma'],
];
const PRIVATE = ['/login', '/signup', '/account', '/my-results', '/admin', '/this-page-does-not-exist'];

const head = `({
  title: document.title,
  description: document.querySelector('meta[name="description"]')?.content ?? '',
  robots: document.querySelector('meta[name="robots"]')?.content ?? '',
  canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
  ogTitle: document.querySelector('meta[property="og:title"]')?.content ?? '',
})`;

const page = await launch(9359);
try {
  await page.viewport(1440, 900);
  for (const [p, title] of PUBLIC) {
    await page.goto(BASE + p);
    await page.waitFor(`document.title === ${JSON.stringify(title)}`, 8000).catch(() => {});
    const m = await page.eval(head);
    check(
      m.title === title && m.ogTitle === title && m.description.length > 40 && !/workshop/i.test(m.description) && m.robots === 'index, follow' && m.canonical === `https://transenigma.com${p}`,
      `${p}: "${m.title}"${m.canonical === `https://transenigma.com${p}` ? '' : ` (canonical ${m.canonical})`}`,
    );
  }
  await page.goto(`${BASE}/factors/A`);
  await sleep(800);
  check((await page.eval(head)).title === 'The 16 Personality Factors | Transenigma', '/factors/A uses the factors page title');

  for (const p of PRIVATE) {
    await page.goto(BASE + p);
    await sleep(900);
    const m = await page.eval(head);
    check(m.robots === 'noindex, nofollow' && m.canonical === null && m.title.endsWith('| Transenigma'), `${p}: noindex, no canonical ("${m.title}")`);
  }

  // In-app navigation updates the head too (no full reload).
  await page.goto(`${BASE}/`);
  await page.waitText('Our Ventures');
  await page.eval(`document.querySelector('footer a[href="/consultancy"]').click()`);
  await page.waitFor(`location.pathname === '/consultancy'`);
  await sleep(300);
  check((await page.eval(head)).title === 'Consultancy | Transenigma', 'title updates on in-app navigation');
} finally {
  await page.close();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll page-meta checks passed');
process.exit(failures ? 1 : 0);
