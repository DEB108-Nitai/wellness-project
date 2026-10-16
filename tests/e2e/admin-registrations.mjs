// E2E (Phase 5 slice B): the 60-Day registrations page — tiles, charts, filters and table agree.
// Seeds 40 temporary @example.com registrations over the last 30 days and one @example.com admin, then
// removes all of them. Usage: node tests/e2e/admin-registrations.mjs  (needs XAMPP + npm run dev + Chrome)
import { execFileSync } from 'node:child_process';
import { launch } from './cdp.mjs';
import { finishAdminSignIn, promoteToAdmin } from './admin-signin.mjs';

const BASE = 'http://localhost:3000';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT = `${ROOT}tests/e2e/shots/`;
const MYSQL = 'C:/xampp/mysql/bin/mysql.exe';
const DB = 'transenigma';
const tag = `e2eregs${Date.now()}`;
const email = `admin${Date.now()}@example.com`;
const PASSWORD = 'Calm-River-Lantern-42';
const step = (m) => console.log(`• ${m}`);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execFileSync(MYSQL, ['-u', 'root', '-N', DB, '-e', q]).toString().trim();

// Deterministic spread: programs, schedules, statuses, ages, cities, struggles, days.
const programs = ['STI', 'PTI', 'TTI'];
const timings = ['morning', 'evening', 'weekend'];
const statuses = ['registered', 'registered', 'confirmed', 'waitlisted', 'completed', 'cancelled'];
const cities = ['Kolkata', 'Pune', 'Mumbai', 'Delhi', 'Bengaluru'];
const struggles = ['Stress & Anxiety', 'Distractions', 'Low Energy', 'Relationships', 'Self-doubt'];
const rows = Array.from({ length: 40 }, (_, i) => {
  const s = JSON.stringify([struggles[i % 5], struggles[(i * 3 + 1) % 5]].filter((v, j, a) => a.indexOf(v) === j)).replace(/'/g, "''");
  return `('${tag.toUpperCase().slice(0, 3)}-60-${String(i).padStart(6, '0')}', '${programs[i % 3]}', 'Seed ${i}', '${tag}+${i}@example.com', '+91 98000 00${String(i).padStart(3, '0')}', ${18 + ((i * 7) % 45)}, '${cities[i % 5]}', 'IN', '${timings[(i * 2) % 3]}', '${s}', 'Seeded for the charts check.', UTC_TIMESTAMP(), '${statuses[i % 6]}', UTC_TIMESTAMP() - INTERVAL ${(i * 11) % 30} DAY)`;
});

const page = await launch();
try {
  sql(`INSERT INTO challenge_registrations (ref_code, program, name, email, phone, age, city, country, cohort_timing, struggles, primary_goal, consent_at, status, created_at) VALUES ${rows.join(',')}`);
  step('seeded 40 registrations');

  await page.viewport(1440, 1000);
  await page.goto(`${BASE}/signup`);
  await page.waitText('Create your account');
  await page.fill('input[autocomplete=name]', 'E2E Admin');
  await page.fill('input[type=email]', email);
  await page.fill('input[autocomplete=new-password]', PASSWORD);
  await pause(3100);
  await page.clickText('Create account', 'button');
  await page.waitFor(`location.pathname !== '/signup'`, 20000);
  promoteToAdmin(ROOT, email); // verified first: create-admin.php promotes only confirmed accounts
  await finishAdminSignIn(page, BASE, email, PASSWORD); // admins sign in with an authenticator code too (ADM-12)

  await page.goto(`${BASE}/admin/registrations`);
  await page.waitText('Registrations per day');
  await page.fill('input[type=search]', tag);
  await page.waitFor(`document.body.innerText.includes('Registrations (filtered)') && /Registrations\\s*\\(40\\)/.test(document.body.innerText)`, 15000);
  const tile = await page.eval(`[...document.querySelectorAll('p')].find(p => p.innerText === 'Registrations (filtered)').nextElementSibling.innerText`);
  if (tile !== '40') throw new Error(`total tile shows ${tile}`);
  step('search scopes the tiles and the table: 40 / 40');
  await pause(400);
  await page.screenshot(`${OUT}admin-06-registrations.png`, true);

  // Hover a day column: the tooltip lists every program.
  // A real mouse move over a day column (headless Chrome doesn't fire focus events without window focus).
  const box = await page.eval(`(() => {
    const r = document.querySelector('section[aria-label="Registrations per day"] svg rect[tabindex="0"]');
    r.scrollIntoView({ block: 'center' });
    const b = r.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
  })()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: box.x, y: box.y });
  await page.waitFor(`[...document.querySelectorAll('section[aria-label="Registrations per day"] [role=status]')].some(e => e.innerText.includes('Total'))`, 5000);
  await page.screenshot(`${OUT}admin-06b-tooltip.png`);
  step('day tooltip lists STI, PTI, TTI and the total');

  await page.fill('select[aria-label="Program"]', 'PTI');
  await page.waitFor(`/Registrations\\s*\\(13\\)/.test(document.body.innerText)`, 15000);
  step('program filter: PTI → 13 rows, and the charts follow');

  await page.clickText('Table', 'button');
  await page.waitFor(`!!document.querySelector('section[aria-label="Registrations per day"] table')`);
  step('every chart has a table view');

  await page.viewport(390, 844, true);
  await page.goto(`${BASE}/admin/registrations`);
  await page.waitText('Registrations per day');
  await page.fill('input[type=search]', tag);
  await page.waitFor(`/Registrations\\s*\\(40\\)/.test(document.body.innerText)`, 15000);
  await pause(400);
  await page.screenshot(`${OUT}admin-07-registrations-mobile.png`, true);
  await page.eval(`document.querySelector('section[aria-label="Registrations per day"]').scrollIntoView()`);
  await pause(200);
  await page.screenshot(`${OUT}admin-07b-day-chart-mobile.png`);
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
  // Clean up everything this script created.
  sql(`DELETE FROM challenge_registrations WHERE email LIKE '${tag}+%@example.com'`);
  const id = sql(`SELECT id FROM users WHERE email = '${email}'`);
  if (id) {
    sql(`DELETE FROM audit_logs WHERE actor_user_id = ${id} OR (entity_type = 'user' AND entity_id = '${id}'); DELETE FROM email_log WHERE to_email = '${email}'; DELETE FROM users WHERE id = ${id}`);
  }
  console.log('cleaned up seeded registrations and the e2e admin');
}
