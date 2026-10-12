// E2E (Phase 5 slice H): messages, subscribers, FAQs, audit log, question set. Uses one temporary
// @example.com admin plus a seeded message and subscriber; everything is removed at the end.
// Usage: node tests/e2e/admin-site.mjs   (needs XAMPP + npm run dev + Chrome)
import { execFileSync } from 'node:child_process';
import { launch } from './cdp.mjs';
import { finishAdminSignIn, promoteToAdmin } from './admin-signin.mjs';

const BASE = 'http://localhost:3000';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT = `${ROOT}tests/e2e/shots/`;
const PASSWORD = 'Calm-River-Lantern-42';
const tag = `e2e${Date.now() % 100000}`;
const email = `admin${tag}@example.com`;
const sender = `sender${tag}@example.com`;
const reader = `reader${tag}@example.com`;
const QUESTION = `Can I pause the 60-day program (${tag})?`;
const step = (m) => console.log(`• ${m}`);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execFileSync('C:/xampp/mysql/bin/mysql.exe', ['-u', 'root', '-N', 'transenigma'], { input: q }).toString().trim();
const fillLabel = (page, label, value) =>
  page.eval(`(() => {
    const l = [...document.querySelectorAll('[role=dialog] label')].find(x => x.innerText.trim().startsWith(${JSON.stringify(label)}));
    const el = document.getElementById(l.htmlFor);
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);

const page = await launch();
try {
  sql(`DELETE FROM rate_limits WHERE bucket IN ('signup', 'login', 'login_ip', '2fa', '2fa_ip');
       INSERT INTO contact_messages (name, email, subject, message) VALUES ('E2E Sender', '${sender}', 'Question ${tag}', 'Hello,\\nI would like to know when the next PTI cohort starts.');
       INSERT INTO newsletter_subscribers (email, unsubscribe_token) VALUES ('${reader}', '${tag.padEnd(32, '0')}');`);
  await page.viewport(1440, 1000);
  await page.goto(`${BASE}/signup`);
  await page.waitText('Create your account');
  await page.fill('input[autocomplete=name]', 'E2E Site Admin');
  await page.fill('input[type=email]', email);
  await page.fill('input[autocomplete=new-password]', PASSWORD);
  await pause(3100);
  await page.clickText('Create account', 'button');
  await page.waitFor(`location.pathname !== '/signup'`, 20000);
  promoteToAdmin(ROOT, email); // verified first: create-admin.php promotes only confirmed accounts
  await finishAdminSignIn(page, BASE, email, PASSWORD);
  step('admin signed in with two-step sign-in');

  // 1. Messages: open, mark handled, moves to Handled.
  await page.goto(`${BASE}/admin/messages`);
  await page.waitText(`Question ${tag}`);
  await page.screenshot(`${OUT}admin-11-messages.png`, true);
  await page.clickText(`Question ${tag}`, 'button');
  await page.waitText('next PTI cohort');
  if (!(await page.eval(`!!document.querySelector('[role=dialog] a[href^="mailto:${sender}"]')`))) throw new Error('no reply link');
  await page.screenshot(`${OUT}admin-12-message.png`);
  await page.clickText('Mark handled', '[role=dialog] button');
  await page.waitText('handled');
  await page.eval(`document.querySelector('[role=dialog] [aria-label=Close]').click()`);
  await page.waitFor(`!document.body.innerText.includes('Question ${tag}')`);
  await page.clickText('Handled', '[role=tab]');
  await page.waitText(`Question ${tag}`);
  step('message opened (reply link), marked handled, listed under Handled');

  // 2. Subscribers.
  await page.goto(`${BASE}/admin/subscribers`);
  await page.waitText(reader);
  const csv = await page.eval(`fetch('/api/admin/export/subscribers?q=${reader}').then(r => r.text())`);
  if (!csv.includes(reader) || csv.includes(tag.padEnd(32, '0'))) throw new Error('subscriber export wrong or leaks the token');
  await page.screenshot(`${OUT}admin-13-subscribers.png`);
  step('subscriber listed; export has the email and no unsubscribe token');

  // 3. FAQs: add in a new category, visible on /faq, move up, delete.
  await page.goto(`${BASE}/admin/faqs`);
  await page.waitText('published questions');
  await page.clickText('Add FAQ', 'button');
  await page.waitText('Add an FAQ');
  await fillLabel(page, 'Category', '60 Days Challenge');
  await fillLabel(page, 'Question', QUESTION);
  await fillLabel(page, 'Answer', 'Yes. Write to us and we will move you to the next cohort.');
  await page.clickText('Add FAQ', '[role=dialog] button');
  await page.waitText('FAQ added at the end of the FAQ page');
  await page.eval(`document.querySelector('[aria-label="Move “${QUESTION}” up"]').click()`);
  await page.waitText('Order saved');
  await page.screenshot(`${OUT}admin-14-faqs.png`, true);
  await page.goto(`${BASE}/faq`);
  await page.waitText(QUESTION);
  step('FAQ added, moved, and shown on the FAQ page');
  await page.goto(`${BASE}/admin/faqs`);
  await page.waitText(QUESTION);
  await page.eval(`document.querySelector('[aria-label="Delete “${QUESTION}”"]').click()`);
  await page.clickText('Delete FAQ', '[role=dialog] button');
  await page.waitText('FAQ deleted.');
  step('FAQ deleted');

  // 4. Audit log shows what just happened, in plain words.
  await page.goto(`${BASE}/admin/audit`);
  await page.waitText('Added an FAQ');
  await page.waitText('Marked a message handled');
  await page.screenshot(`${OUT}admin-15-audit.png`);
  step('audit log lists the FAQ and message actions in plain words');

  // 5. Question set and norms.
  await page.goto(`${BASE}/admin/question-set`);
  await page.waitText('Statements (166)');
  await page.fill('select[aria-label="Show statements for"]', 'checks');
  await page.waitFor(`document.querySelectorAll('section[aria-label=Statements] tbody tr').length === 3`);
  await page.clickText('Norms', '[role=tab]');
  await page.waitText('16 factors');
  await page.screenshot(`${OUT}admin-16-norms.png`);
  step('question set: 166 statements, 3 attention checks; norms table');

  // 6. Phone width.
  await page.viewport(390, 844, true);
  for (const path of ['/admin/messages', '/admin/audit', '/admin/faqs', '/admin/question-set']) {
    await page.goto(`${BASE}${path}`);
    await pause(900);
    if (await page.eval(`document.documentElement.scrollWidth > window.innerWidth + 1`)) throw new Error(`horizontal scroll at 390 px on ${path}`);
  }
  await page.screenshot(`${OUT}admin-17-question-set-mobile.png`);
  step('phone width: no sideways scroll on the new pages');

  console.log(`\nRESULT: PASS (${email})`);
} catch (err) {
  console.error(`\nRESULT: FAIL — ${err.message}`);
  await page.screenshot(`${OUT}FAIL.png`).catch(() => {});
  process.exitCode = 1;
} finally {
  if (page.consoleErrors.length) console.log('Browser console errors:\n  ' + page.consoleErrors.join('\n  '));
  await page.close();
  const id = sql(`SELECT id FROM users WHERE email = '${email}'`);
  sql(`DELETE FROM contact_messages WHERE email = '${sender}'; DELETE FROM newsletter_subscribers WHERE email = '${reader}';
       DELETE FROM faqs WHERE question LIKE '%(${tag})%';
       ${id ? `DELETE FROM audit_logs WHERE actor_user_id = ${id} OR (entity_type = 'user' AND entity_id = '${id}'); DELETE FROM users WHERE id = ${id};` : ''}
       DELETE FROM email_log WHERE to_email = '${email}';`);
  console.log('removed the e2e admin, message, subscriber and FAQ');
}
