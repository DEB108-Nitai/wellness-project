// E2E (Phase 5 slices F/F2): users list and detail, disable/enable, anonymise; the Admins page read-only for an
// admin who is not the primary one. Creates two @example.com accounts and removes them. The primary admin's own
// actions (add, remove, hand over) are covered by api/tests/AdminUsersTest.php, so the owner's account is never
// touched here. Usage: node tests/e2e/admin-users.mjs   (needs XAMPP + npm run dev + Chrome)
import { execFileSync } from 'node:child_process';
import { launch } from './cdp.mjs';
import { finishAdminSignIn, promoteToAdmin, signOut } from './admin-signin.mjs';

const BASE = 'http://localhost:3000';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT = `${ROOT}tests/e2e/shots/`;
const PASSWORD = 'Calm-River-Lantern-42';
const tag = Date.now() % 1000000;
const email = `admin${tag}@example.com`;
const memberEmail = `member${tag}@example.com`;
const step = (m) => console.log(`• ${m}`);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execFileSync('C:/xampp/mysql/bin/mysql.exe', ['-u', 'root', '-N', 'transenigma'], { input: q }).toString().trim();

async function signUp(page, name, address) {
  await page.goto(`${BASE}/signup`);
  await page.waitText('Create your account');
  await page.fill('input[autocomplete=name]', name);
  await page.fill('input[type=email]', address);
  await page.fill('input[autocomplete=new-password]', PASSWORD);
  await pause(3100);
  await page.clickText('Create account', 'button');
  await page.waitFor(`location.pathname !== '/signup'`, 20000);
}

const page = await launch();
let memberId = '';
try {
  sql(`DELETE FROM rate_limits WHERE bucket IN ('signup', 'login', 'login_ip', '2fa', '2fa_ip')`);
  await page.viewport(1440, 1000);
  await signUp(page, `Erin Member ${tag}`, memberEmail);
  memberId = sql(`SELECT id FROM users WHERE email = '${memberEmail}'`);
  sql(`INSERT INTO contact_messages (name, email, subject, message) VALUES ('Erin', '${memberEmail}', 'Please delete my data', 'I would like my account erased.')`);
  await signOut(page);
  await signUp(page, 'E2E Users Admin', email);
  promoteToAdmin(ROOT, email); // verified first: create-admin.php promotes only confirmed accounts
  await finishAdminSignIn(page, BASE, email, PASSWORD);
  step('a member and a (non-primary) admin are ready');

  // 1. Find the member and open the account.
  await page.goto(`${BASE}/admin/users`);
  await page.waitText('Accounts');
  await page.fill('input[type=search]', memberEmail);
  await page.waitFor(`document.querySelectorAll('section[aria-label=Accounts] tbody tr').length === 1`);
  await page.screenshot(`${OUT}admin-18-users.png`);
  await page.clickText(`Erin Member ${tag}`, 'a');
  await page.waitText('Recent activity');
  await page.waitText('Contact messages');
  step('search by email, open the account (tests, registrations, messages, activity)');

  // 2. Disable, then enable.
  await page.clickText('Disable account', 'button');
  await page.clickText('Disable account', '[role=dialog] button');
  await page.waitText('Account disabled');
  if (sql(`SELECT status FROM users WHERE id = ${memberId}`) !== 'disabled') throw new Error('not disabled in the database');
  await page.clickText('Enable account', 'button');
  await page.clickText('Enable account', '[role=dialog] button');
  await page.waitText('Account enabled');
  step('disable and enable again');

  // 3. Anonymise: the button stays off until the email is typed exactly.
  await page.screenshot(`${OUT}admin-19-user-detail.png`, true);
  await page.clickText('Anonymise this account', 'button');
  await page.waitText('Anonymise this account?');
  await page.fill('[role=dialog] input', 'someone@example.com');
  if (!(await page.eval(`document.querySelector('[role=dialog] button[type=submit]').disabled`))) throw new Error('anonymise allowed without the exact email');
  await page.fill('[role=dialog] input', memberEmail.toUpperCase());
  await page.clickText('Anonymise for good', '[role=dialog] button');
  await page.waitText('The account was anonymised');
  await page.waitText('Email removed (anonymised)');
  const row = sql(`SELECT CONCAT(name, '|', email, '|', status) FROM users WHERE id = ${memberId}`);
  if (row !== `Anonymised user|anon-${memberId}@invalid|disabled`) throw new Error(`not anonymised: ${row}`);
  if (sql(`SELECT COUNT(*) FROM contact_messages WHERE email = '${memberEmail}'`) !== '0') throw new Error('message kept');
  step('anonymised: name and email gone, message deleted, account closed');

  // 4. Admins page: read-only for an admin who is not the primary one.
  await page.goto(`${BASE}/admin/admins`);
  await page.waitText('Only the primary admin');
  if (await page.eval(`[...document.querySelectorAll('button')].some((b) => /Add admin|Remove|Make primary/.test(b.innerText))`)) throw new Error('team buttons shown to a non-primary admin');
  const denied = await page.eval(`fetch('/api/auth/me').then((r) => r.json()).then((j) => fetch('/api/admin/admins', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': j.data.csrfToken }, body: JSON.stringify({ email: '${memberEmail}', code: '123456' }) })).then((r) => r.json())`);
  if (denied.error?.code !== 'PRIMARY_ADMIN_ONLY') throw new Error(`server allowed it: ${JSON.stringify(denied)}`);
  step('admins page is read-only for a non-primary admin, and the server refuses the action too');

  // 5. Phone width.
  await page.viewport(390, 844, true);
  for (const path of ['/admin/users', `/admin/users/${memberId}`, '/admin/admins']) {
    await page.goto(`${BASE}${path}`);
    await pause(900);
    if (await page.eval(`document.documentElement.scrollWidth > window.innerWidth + 1`)) throw new Error(`horizontal scroll at 390 px on ${path}`);
  }
  step('phone width: no sideways scroll');

  console.log(`\nRESULT: PASS (${email})`);
} catch (err) {
  console.error(`\nRESULT: FAIL — ${err.message}`);
  await page.screenshot(`${OUT}FAIL.png`).catch(() => {});
  process.exitCode = 1;
} finally {
  if (page.consoleErrors.length) console.log('Browser console errors:\n  ' + page.consoleErrors.join('\n  '));
  await page.close();
  const adminId = sql(`SELECT id FROM users WHERE email = '${email}'`);
  const ids = [adminId, memberId].filter(Boolean).join(',');
  if (ids) {
    sql(`DELETE FROM audit_logs WHERE actor_user_id IN (${ids}) OR (entity_type = 'user' AND entity_id IN (${ids.split(',').map((i) => `'${i}'`).join(',')}));
         DELETE FROM contact_messages WHERE email = '${memberEmail}'; DELETE FROM email_log WHERE to_email IN ('${email}', '${memberEmail}');
         DELETE FROM users WHERE id IN (${ids});`);
  }
  console.log('removed the e2e admin and member');
}
