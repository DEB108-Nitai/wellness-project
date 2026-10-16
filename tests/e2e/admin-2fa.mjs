// E2E (Phase 5 slice G): admin two-step sign-in. First sign-in sets up the app and shows recovery codes;
// later sign-ins need a code; a recovery code works once; the Security page makes new codes and moves to a
// new phone. Uses one temporary @example.com account that is removed at the end.
// Usage: node tests/e2e/admin-2fa.mjs   (needs XAMPP + npm run dev + Chrome)
import { execFileSync } from 'node:child_process';
import { launch } from './cdp.mjs';
import { finishAdminSignIn, passwordSignIn, promoteToAdmin, signOut, totp } from './admin-signin.mjs';

const BASE = 'http://localhost:3000';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT = `${ROOT}tests/e2e/shots/`;
const PASSWORD = 'Calm-River-Lantern-42';
const email = `admin2fa${Date.now()}@example.com`;
const step = (m) => console.log(`• ${m}`);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execFileSync('C:/xampp/mysql/bin/mysql.exe', ['-u', 'root', '-N', 'transenigma'], { input: q }).toString().trim();
// Each app code works once; between checks the "last used" marker is cleared so the test needn't wait 30 s.
const allowNextCode = () => sql(`UPDATE users SET totp_last_step = NULL WHERE email = '${email}'`);

const page = await launch();
try {
  sql(`DELETE FROM rate_limits WHERE bucket IN ('signup', 'login', 'login_ip', '2fa', '2fa_ip')`); // local runs share one IP
  await page.viewport(1440, 1000);
  await page.goto(`${BASE}/signup`);
  await page.waitText('Create your account');
  await page.fill('input[autocomplete=name]', 'E2E Two Step');
  await page.fill('input[type=email]', email);
  await page.fill('input[autocomplete=new-password]', PASSWORD);
  await pause(3100);
  await page.clickText('Create account', 'button');
  await page.waitFor(`location.pathname !== '/signup'`, 20000);
  promoteToAdmin(ROOT, email); // verified first: create-admin.php promotes only confirmed accounts

  // 1. Promoted mid-session: the old session no longer opens the admin console.
  await page.goto(`${BASE}/admin`);
  await page.waitFor(`location.pathname === '/login'`);
  step('promoted session is sent to sign in again');

  // 2. First sign-in: set up the app (screenshots of both screens).
  await passwordSignIn(page, BASE, email, PASSWORD);
  await page.waitText('Set up two-step sign-in');
  await page.waitFor(`document.querySelector('img[alt^="QR code"]')`);
  await pause(300);
  await page.screenshot(`${OUT}2fa-01-setup.png`, true);
  await page.fill('input[autocomplete=one-time-code]', '000000');
  await page.clickText('Turn on two-step sign-in', 'button');
  await page.waitText('That code is not right');
  step('a wrong code is refused with a clear message');
  await signOut(page);
  const { secret, codes } = await finishAdminSignIn(page, BASE, email, PASSWORD);
  step('setup: QR + key, code accepted, 10 recovery codes shown, then the admin console');

  // 3. Security page.
  await page.goto(`${BASE}/admin/security`);
  await page.waitText('of 10 left');
  if (!(await page.eval(`document.body.innerText.includes('10\\nof 10 left') || /10\\s*of 10 left/.test(document.body.innerText)`))) throw new Error('expected 10 of 10 recovery codes');
  await page.screenshot(`${OUT}2fa-02-security.png`, true);
  step('Security page: on, 10 of 10 recovery codes');

  // 4. A later sign-in asks for the code.
  await signOut(page);
  await passwordSignIn(page, BASE, email, PASSWORD, '/admin/research');
  await page.waitText('Enter your sign-in code');
  await page.screenshot(`${OUT}2fa-03-code.png`);
  allowNextCode();
  await page.fill('input[autocomplete=one-time-code]', totp(secret));
  await page.clickText('Sign in', 'button');
  await page.waitFor(`location.pathname === '/admin/research'`);
  step('later sign-in: code from the app, back to where the admin was going');

  // 5. A recovery code, once.
  await signOut(page);
  await passwordSignIn(page, BASE, email, PASSWORD);
  await page.clickText('Use a recovery code', 'button');
  await page.fill('input[autocomplete=one-time-code]', codes[0]);
  await page.clickText('Sign in', 'button');
  await page.waitText('Signed in with a recovery code');
  await page.waitText('You have 9 recovery codes left');
  await page.clickText('Continue', 'button');
  await page.waitFor(`location.pathname === '/admin'`);
  await signOut(page);
  await passwordSignIn(page, BASE, email, PASSWORD);
  await page.clickText('Use a recovery code', 'button');
  await page.fill('input[autocomplete=one-time-code]', codes[0]);
  await page.clickText('Sign in', 'button');
  await page.waitText('That code is not right');
  step('a recovery code signs in once, then is refused');
  allowNextCode();
  await page.clickText('Use a code from the app instead', 'button');
  await page.fill('input[autocomplete=one-time-code]', totp(secret));
  await page.clickText('Sign in', 'button');
  await page.waitFor(`location.pathname === '/admin'`);

  // 6. New recovery codes, then move to a new phone.
  await page.goto(`${BASE}/admin/security`);
  await page.waitText('9');
  await page.clickText('Create new recovery codes', 'button');
  allowNextCode();
  await page.fill('[role=dialog] input', totp(secret));
  await page.clickText('Create new codes', 'button');
  await page.waitText('Your old recovery codes no longer work');
  await page.eval(`document.querySelector('[role=dialog] input[type=checkbox]').click()`);
  await page.clickText('Done', 'button');
  await page.waitText('10');
  step('new recovery codes: 10 of 10 again');

  await page.clickText('Move to a new phone', 'button');
  allowNextCode();
  await page.fill('[role=dialog] input', totp(secret));
  await page.clickText('Continue', '[role=dialog] button');
  await page.waitFor(`document.querySelector('[role=dialog] p.font-mono.select-all')`);
  const newSecret = (await page.eval(`document.querySelector('[role=dialog] p.font-mono.select-all').innerText`)).replace(/\s/g, '');
  if (newSecret === secret) throw new Error('the new phone got the same secret');
  await page.screenshot(`${OUT}2fa-04-new-phone.png`);
  await page.fill('[role=dialog] input[autocomplete=one-time-code]', totp(newSecret));
  await page.clickText('Use the new phone', 'button');
  await page.waitText('Your new phone is set up');
  await page.clickText('Done', 'button');
  step('moved to a new phone');

  await signOut(page);
  await passwordSignIn(page, BASE, email, PASSWORD);
  allowNextCode();
  await page.fill('input[autocomplete=one-time-code]', totp(secret, 1)); // the old phone
  await page.clickText('Sign in', 'button');
  await page.waitText('That code is not right');
  await page.fill('input[autocomplete=one-time-code]', totp(newSecret));
  await page.clickText('Sign in', 'button');
  await page.waitFor(`location.pathname === '/admin'`);
  step('the old phone no longer works; the new one does');

  // 7. Phone width.
  await signOut(page);
  await page.viewport(390, 844, true);
  await passwordSignIn(page, BASE, email, PASSWORD);
  await page.waitText('Enter your sign-in code');
  await pause(300);
  await page.screenshot(`${OUT}2fa-05-code-mobile.png`, true);
  if (await page.eval(`document.documentElement.scrollWidth > window.innerWidth + 1`)) throw new Error('horizontal scroll at 390 px');
  step('phone width: no sideways scroll');

  const audit = sql(`SELECT GROUP_CONCAT(DISTINCT action ORDER BY action) FROM audit_logs WHERE actor_user_id = (SELECT id FROM users WHERE email = '${email}') AND action LIKE 'AUTH_2FA%'`);
  for (const a of ['AUTH_2FA_CHANGED', 'AUTH_2FA_ENABLED', 'AUTH_2FA_FAILED', 'AUTH_2FA_RECOVERY_REGENERATED', 'AUTH_2FA_RECOVERY_USED']) {
    if (!audit.includes(a)) throw new Error(`missing audit ${a} (have ${audit})`);
  }
  step('every step is in the audit log');

  console.log(`\nRESULT: PASS (${email})`);
} catch (err) {
  console.error(`\nRESULT: FAIL — ${err.message}`);
  await page.screenshot(`${OUT}FAIL.png`).catch(() => {});
  process.exitCode = 1;
} finally {
  if (page.consoleErrors.length) console.log('Browser console errors:\n  ' + page.consoleErrors.join('\n  '));
  await page.close();
  const id = sql(`SELECT id FROM users WHERE email = '${email}'`);
  if (id) sql(`DELETE FROM audit_logs WHERE actor_user_id = ${id} OR (entity_type = 'user' AND entity_id = '${id}'); DELETE FROM email_log WHERE to_email = '${email}'; DELETE FROM users WHERE id = ${id};`);
  console.log('removed the e2e admin');
}
