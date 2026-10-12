// E2E (Phase 5 slice C): participants & results. Uses an existing completed assessment (pass its reference,
// default TE-LCHUHZ in the local database) read-only, plus one temporary @example.com admin that is removed.
// Usage: node tests/e2e/admin-participants.mjs [TE-REF]   (needs XAMPP + npm run dev + Chrome)
import { execFileSync } from 'node:child_process';
import { launch } from './cdp.mjs';
import { finishAdminSignIn } from './admin-signin.mjs';

const BASE = 'http://localhost:3000';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT = `${ROOT}tests/e2e/shots/`;
const REF = process.argv[2] ?? 'TE-LCHUHZ';
const email = `admin${Date.now()}@example.com`;
const step = (m) => console.log(`• ${m}`);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execFileSync('C:/xampp/mysql/bin/mysql.exe', ['-u', 'root', '-N', 'transenigma', '-e', q]).toString().trim();

const page = await launch();
try {
  sql(`DELETE FROM rate_limits WHERE bucket IN ('signup', 'login', 'login_ip', '2fa', '2fa_ip')`); // local runs all come from one IP
  await page.viewport(1440, 1000);
  await page.goto(`${BASE}/signup`);
  await page.waitText('Create your account');
  await page.fill('input[autocomplete=name]', 'E2E Admin');
  await page.fill('input[type=email]', email);
  await page.fill('input[autocomplete=new-password]', 'Calm-River-Lantern-42');
  await pause(3100);
  await page.clickText('Create account', 'button');
  await page.waitFor(`location.pathname !== '/signup'`, 20000);
  execFileSync('C:/xampp/php/php.exe', [`${ROOT}api/bin/create-admin.php`, email], { input: 'y\n' });
  await finishAdminSignIn(page, BASE, email, 'Calm-River-Lantern-42'); // admins sign in with an authenticator code too (ADM-12)

  await page.goto(`${BASE}/admin/participants`);
  await page.waitText('Assessments started');
  await page.fill('input[type=search]', REF);
  await page.waitFor(`document.body.innerText.includes(${JSON.stringify(REF)}) && /Assessments\\s*\\(1\\)/.test(document.body.innerText)`, 15000);
  step(`search by reference finds ${REF}`);
  await pause(300);
  await page.screenshot(`${OUT}admin-08-participants.png`, true);

  await page.clickText('Open', 'a');
  await page.waitText('16 personality factors');
  const factors = await page.eval(`document.querySelectorAll('[aria-label*="sten"]').length`);
  if (factors !== 21) throw new Error(`expected 16 factor + 5 domain scales, found ${factors}`);
  await page.waitText('Answers (');
  step('detail shows the person, 16 factors, 5 domains and the answers');
  await page.screenshot(`${OUT}admin-09-participant-detail.png`, true);

  await page.fill('select[aria-label="Show answers"]', 'checks');
  await page.waitFor(`document.querySelectorAll('tbody tr').length === 3`);
  step('answers filter: the 3 attention checks');

  // The export links stream a CSV with the session cookie.
  const csv = await page.eval(`fetch('/api/admin/export/sessions?q=${REF}&answers=1').then(r => r.text())`);
  const lines = csv.replace(/^﻿/, '').trim().split(/\r?\n/);
  const cols = lines[0].split(',').length;
  if (lines.length !== 2 || cols !== 16 + 16 + 5 + 166) throw new Error(`export: ${lines.length} lines, ${cols} columns`);
  step('export with answers: 1 row, 203 columns');

  await page.viewport(390, 844, true);
  await page.goto(`${BASE}/admin/participants/${REF}`);
  await page.waitText('16 personality factors');
  await pause(300);
  await page.screenshot(`${OUT}admin-10-participant-mobile.png`, true);
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
  const id = sql(`SELECT id FROM users WHERE email = '${email}'`);
  if (id) sql(`DELETE FROM audit_logs WHERE actor_user_id = ${id} OR (entity_type = 'user' AND entity_id = '${id}'); DELETE FROM email_log WHERE to_email = '${email}'; DELETE FROM users WHERE id = ${id}`);
  console.log('removed the e2e admin');
}
