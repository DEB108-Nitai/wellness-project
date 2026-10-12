// E2E (Phase 5 slice D): the private visitor counter and the Visitors page.
// Seeds 30 days of page views (visitor codes starting "e2e"), checks that our automated browser is NOT
// counted, views the page at desktop and phone width, then removes the seeded rows and the temporary admin.
// Usage: node tests/e2e/admin-visitors.mjs   (needs XAMPP + npm run dev + Chrome)
import { execFileSync } from 'node:child_process';
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:3000';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT = `${ROOT}tests/e2e/shots/`;
const email = `admin${Date.now()}@example.com`;
const step = (m) => console.log(`• ${m}`);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
// SQL goes in on stdin: the seed is longer than a Windows command line allows.
const sql = (q) => execFileSync('C:/xampp/mysql/bin/mysql.exe', ['-u', 'root', '-N', 'transenigma'], { input: q }).toString().trim();

const pages = ['/', '/', '/research', '/test', '/consultancy', '/team', '/', '/research', '/contact', '/results/*'];
const refs = ['google.com', 'linkedin.com', null, 'facebook.com', null, null];
const rows = [];
for (let d = 0; d < 30; d++) {
  const visitors = 4 + ((d * 7) % 9) + (d % 7 === 2 ? 6 : 0);
  for (let v = 0; v < visitors; v++) {
    const hash = `e2e${String(d).padStart(2, '0')}${String(v).padStart(3, '0')}`.padEnd(64, '0');
    const n = 1 + ((v + d) % 3);
    for (let p = 0; p < n; p++) {
      const ref = p === 0 ? refs[(v + d) % refs.length] : null;
      rows.push(`(UTC_DATE() - INTERVAL ${d} DAY, '${pages[(v * 3 + p + d) % pages.length]}', '${hash}', ${ref ? `'${ref}'` : 'NULL'})`);
    }
  }
}

const page = await launch();
try {
  sql(`INSERT INTO page_views (day, path, visitor_hash, referrer_host) VALUES ${rows.join(',')}`);
  step(`seeded ${rows.length} page views over 30 days`);
  const before = Number(sql(`SELECT COUNT(*) FROM page_views WHERE visitor_hash NOT LIKE 'e2e%'`));

  sql(`DELETE FROM rate_limits WHERE bucket = 'signup'`);
  await page.viewport(1440, 1000);
  await page.goto(`${BASE}/signup`);
  await page.waitText('Create your account');
  await page.goto(`${BASE}/research`);
  await page.waitText('publications across');
  await page.goto(`${BASE}/signup`);
  await page.fill('input[autocomplete=name]', 'E2E Admin');
  await page.fill('input[type=email]', email);
  await page.fill('input[autocomplete=new-password]', 'Calm-River-Lantern-42');
  await pause(3100);
  await page.clickText('Create account', 'button');
  await page.waitFor(`location.pathname !== '/signup'`, 20000);
  execFileSync('C:/xampp/php/php.exe', [`${ROOT}api/bin/create-admin.php`, email], { input: 'y\n' });
  const after = Number(sql(`SELECT COUNT(*) FROM page_views WHERE visitor_hash NOT LIKE 'e2e%'`));
  if (after !== before) throw new Error(`the automated browser was counted (${after - before} views)`);
  step('our automated browser is not counted');

  await page.goto(`${BASE}/admin/visitors`);
  await page.waitText('Visitors per day');
  await page.waitText('Average visitors per day');
  await pause(400);
  await page.screenshot(`${OUT}admin-11-visitors.png`, true);
  const avg = await page.eval(`[...document.querySelectorAll('p')].find(p => p.innerText === 'Average visitors per day').nextElementSibling.innerText`);
  if (!(Number(avg) > 0)) throw new Error(`average shows ${avg}`);
  await page.waitText('google.com');
  await page.waitText('/research');
  step(`visitors page: average ${avg} a day, top pages and sources shown`);
  if (await page.eval(`document.body.innerText.includes('/admin')`)) throw new Error('an admin page appears in the stats');

  await page.viewport(390, 844, true);
  await page.goto(`${BASE}/admin/visitors`);
  await page.waitText('Visitors per day');
  await pause(300);
  await page.screenshot(`${OUT}admin-12-visitors-mobile.png`, true);
  if (await page.eval(`document.documentElement.scrollWidth > window.innerWidth + 1`)) throw new Error('horizontal scroll at 390 px');
  step('phone width: no sideways scroll');

  console.log(`\nRESULT: PASS (${email})`);
} catch (err) {
  console.error(`\nRESULT: FAIL — ${err.message}`);
  await page.screenshot(`${OUT}FAIL.png`).catch(() => {});
  process.exitCode = 1;
} finally {
  if (page.consoleErrors.length) console.log('Browser console errors:\n  ' + page.consoleErrors.join('\n  '));
  await page.close();
  sql(`DELETE FROM page_views WHERE visitor_hash LIKE 'e2e%'`);
  const id = sql(`SELECT id FROM users WHERE email = '${email}'`);
  if (id) sql(`DELETE FROM audit_logs WHERE actor_user_id = ${id} OR (entity_type = 'user' AND entity_id = '${id}'); DELETE FROM email_log WHERE to_email = '${email}'; DELETE FROM users WHERE id = ${id}`);
  console.log('removed the seeded views and the e2e admin');
}
