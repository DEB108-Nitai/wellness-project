// E2E (Phase 5 finish): the whole loop in one run. A visitor registers for the 60-day programs, writes to us and
// subscribes; an admin (two-step sign-in) handles the registration and the message, adds a paper that the public
// site picks up at once, opens a participant, and toggles maintenance; then a normal member is refused on every
// admin page and every admin API route. Replaces phase4-flow.mjs. All rows it creates are removed at the end.
// Usage: node tests/e2e/admin-flow.mjs   (needs XAMPP + npm run dev + Chrome)
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { finishAdminSignIn, promoteToAdmin, signOut } from './admin-signin.mjs';

const BASE = 'http://localhost:3000';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT = `${ROOT}tests/e2e/shots/`;
const PASSWORD = 'Calm-River-Lantern-42';
const tag = `flow${Date.now() % 1000000}`;
const visitor = `visitor${tag}@example.com`;
const adminEmail = `admin${tag}@example.com`;
const memberEmail = `member${tag}@example.com`;
const PAPER = `Sharma, R. and Das, V., 2026. Daily attention practice in Indian classrooms (${tag}). Journal of E2E Studies, 2(1), pp. 1–9.`;
const step = (m) => console.log(`• ${m}`);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execFileSync('C:/xampp/mysql/bin/mysql.exe', ['-u', 'root', '-N', 'transenigma'], { input: q }).toString().trim();
const stats = (page) => page.eval(`fetch('/api/content/stats').then(r => r.json()).then(j => j.data)`);
const noSideways = (page) => page.eval(`document.documentElement.scrollWidth <= window.innerWidth + 1`);

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

async function fillRegistration(page) {
  await page.fill('#reg-name', 'Rahul Sharma');
  await page.fill('#reg-email', visitor);
  await page.fill('#reg-phone', '+91 98765 43210');
  await page.fill('#reg-age', '27');
  await page.fill('#reg-city', 'Pune');
}

// Every /admin API route from the route table, with sample values for its placeholders.
const ADMIN_ROUTES = [...readFileSync(`${ROOT}api/routes.php`, 'utf8').matchAll(/\$r->(get|post|put|patch|delete)\(['"](\/admin[^'"]*)['"]/g)]
  .map(([, method, path]) => ({ method: method.toUpperCase(), path: path.replace(/\{ref:[^}]+\}\}?/, 'TE-ABCDEF').replace(/\{[^}]+\}|\$id/g, '1') }));

const page = await launch();
try {
  sql(`DELETE FROM rate_limits WHERE bucket IN ('signup', 'login', 'login_ip', '2fa', '2fa_ip', 'test_start') OR bucket LIKE 'challenge%' OR bucket LIKE 'contact%' OR bucket LIKE 'newsletter%'`);
  await page.viewport(1440, 1000);

  // 1. Visitor: programs in order, register for PTI (consent and the new required fields), duplicate refused, join STI.
  await page.goto(`${BASE}/#60-days-challenge`);
  await page.waitText('Our Three 60-Day');
  const order = await page.eval(`(() => { const t = document.body.innerText;
    return [t.indexOf('Sonic Therapeutic Intervention'), t.indexOf('Philosophical Therapeutic Intervention'), t.indexOf('Transcendental Therapeutic Intervention (TTI)')]; })()`);
  if (!(order[0] < order[1] && order[1] < order[2])) throw new Error('program order is not STI → PTI → TTI: ' + order);
  step('programs appear in order STI → PTI → TTI');

  await page.clickText('Start the PTI Challenge', 'button');
  await page.waitText('Philosophical Therapeutic Intervention 60-Day Challenge');
  if ((await page.eval(`document.getElementById('reg-country').value`)) !== 'IN') throw new Error('country does not start on India');
  await page.fill('#reg-name', 'Rahul Sharma');
  await page.fill('#reg-email', visitor);
  await page.fill('#reg-phone', '+91 98765 43210');
  await page.clickText('Confirm 60-Day Challenge Registration', 'button');
  await page.waitText('Please enter your city.');
  await page.waitText('Please accept to continue');
  step('age, city and consent are required; country starts on India');
  await fillRegistration(page);
  await page.clickText('Evening Track', 'button');
  await page.clickText('Stress & Anxiety', 'button');
  await page.eval(`document.querySelector('[role=dialog] input[type=checkbox]').click()`);
  await pause(3200); // human-like fill time (spam guard)
  await page.clickText('Confirm 60-Day Challenge Registration', 'button');
  await page.waitText('Registered successfully');
  await page.clickText('Close', 'button');
  await page.clickText('Start the PTI Challenge', 'button');
  await fillRegistration(page);
  await page.eval(`document.querySelector('[role=dialog] input[type=checkbox]').click()`);
  await pause(3200);
  await page.clickText('Confirm 60-Day Challenge Registration', 'button');
  await page.waitText('Registered successfully'); // same answer for a repeat: nobody can learn who joined what
  if (sql(`SELECT COUNT(*) FROM challenge_registrations WHERE email = '${visitor}' AND program = 'PTI'`) !== '1') throw new Error('a repeat PTI registration was stored');
  if (sql(`SELECT COUNT(*) FROM email_log WHERE to_email = '${visitor}' AND template = 'challenge-already-registered'`) !== '1') throw new Error('no "already registered" email');
  await page.clickText('Close', 'button');
  await page.clickText('Start the PTI Challenge', 'button');
  await fillRegistration(page);
  await page.clickText('Sonic (STI)', '[role=dialog] button');
  await page.eval(`document.querySelector('[role=dialog] input[type=checkbox]').click()`);
  await pause(3200);
  await page.clickText('Confirm 60-Day Challenge Registration', 'button');
  await page.waitText('Registered successfully');
  await page.clickText('Close', 'button');
  step('PTI registered; a repeat gets the same answer, is not stored, and is emailed instead; STI joined too');

  // 2. Visitor: contact message and newsletter.
  await page.goto(`${BASE}/contact`);
  await page.waitFor(`document.querySelector('form input')`);
  await page.fill('form input[type=text]', 'Rahul Sharma');
  await page.fill('form input[type=email]', visitor);
  await page.eval(`(() => { const ta = document.querySelector('form textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, 'Namaste! Are the PTI circles available online from Pune? (${tag})');
    ta.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await pause(3200);
  await page.clickText('Send Message', 'button');
  await page.waitFor(`!document.querySelector('form textarea')`);
  await page.fill('footer input[type=email]', visitor);
  await page.clickText('Subscribe', 'footer button');
  await page.waitText('Thank you for subscribing');
  step('contact message sent and newsletter subscribed');

  // 3. Admin signs in with the two-step code.
  await signUp(page, 'E2E Flow Admin', adminEmail);
  promoteToAdmin(ROOT, adminEmail); // verified first: create-admin.php promotes only confirmed accounts
  await finishAdminSignIn(page, BASE, adminEmail, PASSWORD);
  await page.waitText('Today at a glance');
  await page.screenshot(`${OUT}flow-01-overview.png`);
  step('admin signed in (password + authenticator code) and sees the Overview');

  // 4. The registration: found, filtered, confirmed.
  await page.goto(`${BASE}/admin/registrations`);
  await page.waitText('Registrations per day');
  await page.fill('input[type=search]', visitor);
  await page.waitText('Rahul Sharma');
  await page.fill('select[aria-label="Program"]', 'PTI');
  await page.waitFor(`document.querySelectorAll('section[aria-label=Registrations] tbody tr').length === 1`);
  await page.clickText('Open', 'section[aria-label=Registrations] tbody button');
  await page.waitText('Pune');
  await page.fill('[role=dialog] select', 'confirmed');
  await page.clickText('Save changes', 'button');
  await page.waitText('Saved.');
  await page.eval(`document.querySelector('[role=dialog] button[aria-label=Close]')?.click()`);
  if (sql(`SELECT CONCAT(status, '|', country) FROM challenge_registrations WHERE email = '${visitor}' AND program = 'PTI'`) !== 'confirmed|IN') throw new Error('registration not confirmed, or the country was not saved');
  step('registration found by email, PTI filter, confirmed (country IN saved)');

  // 5. The message: opened and marked handled.
  await page.goto(`${BASE}/admin/messages`);
  await page.waitFor(`document.querySelector('input[type=search]')`);
  await page.fill('input[type=search]', tag);
  await page.waitText('Rahul Sharma');
  await page.clickText('Rahul Sharma', 'button');
  await page.waitFor(`document.querySelector('[role=dialog] a[href^="mailto:"]')`); // the list previews the text too
  await page.clickText('Mark handled', '[role=dialog] button');
  await page.waitText('handled');
  await page.eval(`document.querySelector('[role=dialog] [aria-label=Close]').click()`);
  step('message opened and marked handled');

  // 6. Content: a paper added in the admin shows on the public site at once, and goes again.
  const before = await stats(page);
  await page.goto(`${BASE}/admin/research`);
  await page.waitText('published papers in');
  await page.clickText('Add paper', 'button');
  await page.waitText('Add a research paper');
  await page.eval(`(() => {
    const field = (label) => document.getElementById([...document.querySelectorAll('[role=dialog] label')].find(l => l.innerText.trim().startsWith(label)).htmlFor);
    const ta = field('Title or full citation');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, ${JSON.stringify(PAPER)});
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    const cat = field('Category');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(cat, [...cat.options].find(o => /^\\d+$/.test(o.value)).value);
    cat.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await page.clickText('Add paper', '[role=dialog] button');
  await page.waitText('Paper added.');
  const after = await stats(page);
  if (after.publications !== before.publications + 1) throw new Error(`publications ${before.publications} → ${after.publications}`);
  await page.goto(`${BASE}/`);
  await page.waitText(`After ${after.publications} publications`);
  await page.goto(`${BASE}/research`);
  await page.waitText(`(${tag})`);
  step(`paper added: home page and research page show ${after.publications} publications and the paper`);
  await page.goto(`${BASE}/admin/research`);
  await page.waitText('published papers in');
  await page.fill('input[type=search]', tag);
  await page.waitText(`(${tag})`);
  await page.eval(`[...document.querySelectorAll('li')].find(li => li.innerText.includes(${JSON.stringify(`(${tag})`)})).querySelector('[aria-label="Delete paper"]').click()`);
  await page.clickText('Delete', '[role=dialog] button');
  await page.waitText('Paper deleted.');
  if ((await stats(page)).publications !== before.publications) throw new Error('count did not go back after deleting');
  step('paper deleted: the count is back');

  // 7. A participant's full record.
  await page.goto(`${BASE}/admin/participants`);
  await page.waitFor(`document.querySelector('a[href^="/admin/participants/TE-"]')`, 15000);
  await page.eval(`document.querySelector('a[href^="/admin/participants/TE-"]').click()`);
  await page.waitText('About the person');
  await page.waitText('Response quality');
  await page.screenshot(`${OUT}flow-02-participant.png`);
  step('participant opened: about the person, timing, quality, scores');

  // 8. Maintenance on (visitors blocked, admin keeps access), then off.
  await page.goto(`${BASE}/admin/settings`);
  await page.waitText('Platform Settings');
  const toggleMaintenance = () => page.eval(`[...document.querySelectorAll('label')].find(l => l.innerText.includes('Maintenance mode')).querySelector('input').click()`);
  await toggleMaintenance();
  await page.clickText('Save settings', 'button');
  await page.waitText('Settings saved.');
  await page.waitText('Maintenance mode is on');
  const guestStatus = await page.eval(`fetch('/api/faqs', { credentials: 'omit' }).then(r => r.status)`);
  if (guestStatus !== 503) throw new Error(`maintenance on, but a visitor got ${guestStatus}`);
  await toggleMaintenance();
  await page.clickText('Save settings', 'button');
  await page.waitText('Settings saved.');
  if ((await page.eval(`fetch('/api/faqs', { credentials: 'omit' }).then(r => r.status)`)) !== 200) throw new Error('maintenance did not switch off');
  step('maintenance on → visitors get 503, admin keeps access; off again');

  // 9. Phone width on the screens used above.
  await page.viewport(390, 844, true);
  for (const path of ['/admin', '/admin/registrations', '/admin/messages', '/admin/research', '/admin/participants', '/admin/settings']) {
    await page.goto(`${BASE}${path}`);
    await pause(900);
    if (!(await noSideways(page))) throw new Error(`horizontal scroll at 390 px on ${path}`);
  }
  await page.viewport(1440, 1000);
  step('phone width: no sideways scroll');

  // 10. A normal member: refused on every admin page and on every admin API route.
  await signOut(page);
  await signUp(page, `Arjun Member ${tag}`, memberEmail);
  for (const path of ['/admin', '/admin/users', '/admin/admins', '/admin/settings']) {
    await page.goto(`${BASE}${path}`);
    await page.waitText('Administrators only');
  }
  await page.screenshot(`${OUT}flow-03-member-refused.png`);
  const results = await page.eval(`(async () => {
    const csrf = (await (await fetch('/api/auth/me')).json()).data.csrfToken;
    const out = [];
    for (const r of ${JSON.stringify(ADMIN_ROUTES)}) {
      const res = await fetch('/api' + r.path, { method: r.method, headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: r.method === 'GET' ? undefined : '{}' });
      out.push(r.method + ' ' + r.path + ' → ' + res.status);
    }
    return out;
  })()`);
  const allowed = results.filter((line) => !line.endsWith('→ 403'));
  if (allowed.length) throw new Error(`a member was not refused:\n  ${allowed.join('\n  ')}`);
  step(`member sees "Administrators only" and gets 403 on all ${results.length} admin API routes`);

  console.log('\nRESULT: PASS');
} catch (err) {
  console.error(`\nRESULT: FAIL — ${err.message}`);
  await page.screenshot(`${OUT}FAIL.png`).catch(() => {});
  process.exitCode = 1;
} finally {
  if (page.consoleErrors.length) console.log('Browser console errors:\n  ' + page.consoleErrors.join('\n  '));
  await page.close();
  // Maintenance must never stay on after a failed run.
  sql(`UPDATE settings SET value = '0' WHERE setting_key = 'maintenance_mode' AND value <> '0'`);
  const ids = sql(`SELECT GROUP_CONCAT(id) FROM users WHERE email IN ('${adminEmail}', '${memberEmail}')`);
  sql(`DELETE FROM audit_logs WHERE entity_type = 'challenge_registration' AND entity_id IN (SELECT ref_code FROM challenge_registrations WHERE email = '${visitor}');
       DELETE FROM challenge_registrations WHERE email = '${visitor}';
       DELETE FROM contact_messages WHERE email = '${visitor}';
       DELETE FROM newsletter_subscribers WHERE email = '${visitor}';
       DELETE FROM publications WHERE citation LIKE '%(${tag})%';
       DELETE FROM email_log WHERE to_email IN ('${visitor}', '${adminEmail}', '${memberEmail}');
       ${ids && ids !== 'NULL' ? `DELETE FROM audit_logs WHERE actor_user_id IN (${ids}) OR (entity_type = 'user' AND entity_id IN (${ids.split(',').map((i) => `'${i}'`).join(',')}));
       DELETE FROM users WHERE id IN (${ids});` : ''}`);
  console.log('removed the e2e visitor rows, paper, admin and member');
}
