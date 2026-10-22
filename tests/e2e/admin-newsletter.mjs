// E2E: write a newsletter in the admin console, with images, preview it, send a test, send it, copy it.
// Uses one temporary @example.com admin and subscriber. The cron sender is NOT run, so nobody is emailed;
// the queued rows, uploaded images and everything else are removed at the end.
// Usage: node tests/e2e/admin-newsletter.mjs   (needs XAMPP + npm run dev + Chrome)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';
import { finishAdminSignIn, promoteToAdmin } from './admin-signin.mjs';

const BASE = 'http://localhost:3000';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = `${ROOT}tests/e2e/shots/`;
const PASSWORD = 'Calm-River-Lantern-42';
const tag = `e2e${Date.now() % 100000}`;
const email = `admin${tag}@example.com`;
const reader = `reader${tag}@example.com`;
const SUBJECT = `October at Transenigma (${tag})`;
const step = (m) => console.log(`• ${m}`);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const sql = (q) => execFileSync('C:/xampp/mysql/bin/mysql.exe', ['-u', 'root', '-N', 'transenigma'], { input: q }).toString().trim();
const files = mkdtempSync(join(tmpdir(), 'te-news-'));

/** Fill the n-th field (0-based) whose label starts with `label`. */
const fillLabel = (page, label, value, n = 0) =>
  page.eval(`(() => {
    const l = [...document.querySelectorAll('label')].filter(x => x.innerText.trim().startsWith(${JSON.stringify(label)}))[${n}];
    const el = document.getElementById(l.htmlFor);
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);

/** Choose a file in the n-th file input, as a person picking it in the file dialog. */
async function chooseFile(page, n, file) {
  await page.eval(`document.querySelectorAll('input[type=file]')[${n}].setAttribute('data-e2e-file', '1')`);
  const { root } = await page.send('DOM.getDocument', { depth: -1 });
  const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'input[data-e2e-file]' });
  await page.send('DOM.setFileInputFiles', { nodeId, files: [file] });
  await page.eval(`document.querySelector('input[data-e2e-file]').removeAttribute('data-e2e-file')`);
}

const page = await launch();
try {
  sql(`DELETE FROM rate_limits WHERE bucket IN ('signup', 'login', 'login_ip', '2fa', '2fa_ip');
       INSERT INTO newsletter_subscribers (email, unsubscribe_token) VALUES ('${reader}', '${tag.padEnd(32, '0')}');`);
  await page.viewport(1440, 1000);
  await page.goto(`${BASE}/signup`);
  await page.waitText('Create your account');
  await page.fill('input[autocomplete=name]', 'E2E News Admin');
  await page.fill('input[type=email]', email);
  await page.fill('input[autocomplete=new-password]', PASSWORD);
  await pause(3100);
  await page.clickText('Create account', 'button');
  await page.waitFor(`location.pathname !== '/signup'`, 20000);
  promoteToAdmin(ROOT, email);
  await finishAdminSignIn(page, BASE, email, PASSWORD);
  step('admin signed in');

  // Test images: a real JPEG made from a site photo, and the WebP original (which email can't use).
  const jpeg = join(files, 'workshop.jpg');
  const webp = join(files, 'photo.webp');
  const [jpgB64, webpB64] = await page.eval(`Promise.all([
    new Promise(r => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); r(c.toDataURL('image/jpeg', 0.85).split(',')[1]); }; i.src = '/images/programs/sti.webp'; }),
    fetch('/images/programs/tti.webp').then(r => r.arrayBuffer()).then(b => btoa(String.fromCharCode(...new Uint8Array(b)))),
  ])`);
  writeFileSync(jpeg, Buffer.from(jpgB64, 'base64'));
  writeFileSync(webp, Buffer.from(webpB64, 'base64'));

  // 1. The menu says Newsletter; the old address opens the Subscribers tab.
  await page.goto(`${BASE}/admin/subscribers`);
  await page.waitFor(`location.pathname === '/admin/newsletter' && location.search === '?tab=subscribers'`);
  await page.waitText(reader);
  if (!(await page.eval(`[...document.querySelectorAll('nav a')].some(a => a.innerText.trim() === 'Newsletter')`))) throw new Error('menu item not renamed');
  await page.screenshot(`${OUT}news-01-subscribers.png`);
  await page.clickText('Newsletters', '[role=tab]');
  await page.waitText('New newsletter');
  step('Newsletter page: Newsletters and Subscribers tabs; /admin/subscribers redirects');

  // 2. A new draft: details, cover image, and one block of each kind.
  await page.clickText('New newsletter', 'button');
  await page.waitFor(`/^\\/admin\\/newsletter\\/\\d+$/.test(location.pathname)`);
  await page.waitText('Email details');
  await fillLabel(page, 'Subject', SUBJECT);
  await fillLabel(page, 'Preview text', 'New cohort dates, a free webinar and what we learned this month.');
  await chooseFile(page, 0, webp);
  await page.waitText('Please choose a JPEG, PNG or GIF image.');
  await chooseFile(page, 0, jpeg);
  await page.waitFor(`document.querySelector('img[src^="/uploads/newsletter/"]')`);
  step('cover image: WebP refused with a clear message, JPEG uploaded and shown');

  for (const b of ['Heading', 'Paragraph', 'Image', 'Button', 'Divider']) await page.clickText(b, 'button');
  await fillLabel(page, 'Heading', 'The next 60-Day program starts on 1 November');
  await fillLabel(page, 'Text', 'Dear friends,\nRegistrations for the **Personal Transformation Initiative** are open. *Seats are limited*, so [register early](https://transenigma.com/60-days-challenge).\n<script>alert(1)</script>');
  await chooseFile(page, 1, jpeg);
  await page.waitFor(`document.querySelectorAll('img[src^="/uploads/newsletter/"]').length === 2`);
  await fillLabel(page, 'Description', 'Participants at a workshop in Kolkata');
  await fillLabel(page, 'Caption', 'Our last workshop in Kolkata');
  await fillLabel(page, 'Button text', 'Register now');
  await fillLabel(page, 'Link', 'transenigma.com/register'); // no https:// on purpose
  await page.eval(`document.querySelector('[aria-label="Move Divider 5 up"]').click()`);
  await page.clickText('Save draft', 'button');
  await page.waitText('highlighted field');
  if (!(await page.eval(`document.body.innerText.includes('starting with https://')`))) throw new Error('bad link not explained');
  await fillLabel(page, 'Link', 'https://transenigma.com/60-days-challenge');
  await page.clickText('Save draft', 'button');
  await page.waitText('Draft saved.');
  await page.screenshot(`${OUT}news-02-editor.png`, true);
  step('blocks added, moved and saved; a link without https:// is refused on its block');

  // 3. Preview: what the server builds, at desktop and phone width.
  await page.clickText('Preview', 'button');
  await page.waitFor(`document.querySelector('iframe[title="Email preview"]')?.contentDocument?.body?.innerText.includes('Register now')`);
  const preview = await page.eval(`(() => { const d = document.querySelector('iframe[title="Email preview"]').contentDocument; return {
    strong: d.querySelector('strong')?.innerText, em: d.querySelector('em')?.innerText, link: d.querySelector('a[href="https://transenigma.com/60-days-challenge"]')?.innerText,
    images: d.querySelectorAll('img[src*="/uploads/newsletter/"]').length, script: d.querySelectorAll('script').length, text: d.body.innerText }; })()`);
  if (preview.strong !== 'Personal Transformation Initiative' || preview.em !== 'Seats are limited' || preview.link !== 'register early') throw new Error(`formatting wrong: ${JSON.stringify(preview)}`);
  if (preview.images !== 2 || preview.script !== 0 || !preview.text.includes('<script>alert(1)</script>')) throw new Error('images or escaping wrong in the preview');
  await pause(400);
  await page.screenshot(`${OUT}news-03-preview-desktop.png`);
  await page.clickText('Phone', '[role=dialog] button');
  await pause(500);
  await page.screenshot(`${OUT}news-04-preview-phone.png`);
  await page.eval(`document.querySelector('[role=dialog] [aria-label=Close]').click()`);
  step('preview: bold, italic, link, 2 images, typed <script> shown as text; desktop and phone');

  // 4. Test to myself.
  await page.clickText('Send me a test', 'button');
  await page.waitText(`Test sent to ${email}`);
  step('test email sent to the admin');

  // 5. Send: confirm, then it shows progress and is read-only. (The cron sender is not run here.)
  const subscribers = Number(sql(`SELECT COUNT(*) FROM newsletter_subscribers WHERE status = 'subscribed'`));
  await page.clickText(`Send to ${subscribers} subscriber`, 'button');
  await page.waitText('Send this newsletter?');
  await page.screenshot(`${OUT}news-05-confirm.png`);
  await page.clickText('Send now', '[role=dialog] button');
  await page.waitText('Sending has started');
  await page.waitText(`0 of ${subscribers} delivered`);
  if (await page.eval(`!!document.querySelector('input[type=file]')`)) throw new Error('a sent newsletter is still editable');
  await page.screenshot(`${OUT}news-06-sending.png`);
  const id = Number(await page.eval(`location.pathname.split('/').pop()`));
  if (sql(`SELECT COUNT(*) FROM newsletter_deliveries WHERE newsletter_id = ${id} AND status = 'pending'`) !== String(subscribers)) throw new Error('queue not filled');
  step(`sent: queued for ${subscribers} subscriber(s), shown as Sending with progress, no longer editable`);

  // 6. Listed, then copied to a new draft and that draft deleted.
  await page.goto(`${BASE}/admin/newsletter`);
  await page.waitText(SUBJECT);
  await page.screenshot(`${OUT}news-07-list.png`);
  await page.clickText(SUBJECT, 'a');
  await page.waitText('Copy to a new draft');
  await page.clickText('Copy to a new draft', 'button');
  await page.waitFor(`location.pathname !== '/admin/newsletter/${id}'`);
  await page.waitText('Edit newsletter');
  await page.waitFor(`[...document.querySelectorAll('input')].some(i => i.value === ${JSON.stringify(SUBJECT)})`); // the copy keeps the content
  await page.clickText('Delete this draft', 'button');
  await page.clickText('Delete draft', '[role=dialog] button');
  await page.waitFor(`location.pathname === '/admin/newsletter'`);
  step('copied to a new draft, which was then deleted');

  // 7. Audit and phone width.
  await page.goto(`${BASE}/admin/audit`);
  await page.waitText('Sent a newsletter');
  await page.viewport(390, 844, true);
  for (const path of ['/admin/newsletter?tab=subscribers', `/admin/newsletter/${id}`, '/admin/newsletter']) {
    await page.goto(`${BASE}${path}`);
    await pause(900);
    if (await page.eval(`document.documentElement.scrollWidth > window.innerWidth + 1`)) throw new Error(`horizontal scroll at 390 px on ${path}`);
  }
  await page.clickText('New newsletter', 'button');
  await page.waitText('Email details');
  await page.clickText('Paragraph', 'button');
  await pause(500);
  if (await page.eval(`document.documentElement.scrollWidth > window.innerWidth + 1`)) throw new Error('horizontal scroll at 390 px in the editor');
  await page.screenshot(`${OUT}news-08-editor-phone.png`);
  step('audited; no sideways scroll at 390 px');

  console.log(`\nRESULT: PASS (${email})`);
} catch (err) {
  console.error(`\nRESULT: FAIL — ${err.message}`);
  await page.screenshot(`${OUT}FAIL.png`).catch(() => {});
  process.exitCode = 1;
} finally {
  if (page.consoleErrors.length) console.log('Browser console errors:\n  ' + page.consoleErrors.join('\n  '));
  await page.close();
  const id = sql(`SELECT id FROM users WHERE email = '${email}'`);
  if (id) {
    // Uploaded images of this admin's newsletters, then the newsletters (their queue rows go with them).
    const images = sql(`SELECT entity_id FROM audit_logs WHERE actor_user_id = ${id} AND action = 'NEWSLETTER_IMAGE_UPLOADED'`).split(/\r?\n/).filter(Boolean);
    for (const p of images) {
      const file = join(ROOT, p);
      if (/^\/uploads\/newsletter\/[a-f0-9]{24}\.(jpg|png|gif)$/.test(p) && existsSync(file)) unlinkSync(file);
    }
    sql(`DELETE FROM newsletters WHERE created_by = ${id} OR sent_by = ${id};
         DELETE FROM audit_logs WHERE actor_user_id = ${id} OR (entity_type = 'user' AND entity_id = '${id}'); DELETE FROM users WHERE id = ${id};`);
  }
  sql(`DELETE FROM newsletter_subscribers WHERE email = '${reader}'; DELETE FROM email_log WHERE to_email = '${email}';`);
  for (const f of ['workshop.jpg', 'photo.webp']) if (existsSync(join(files, f))) unlinkSync(join(files, f));
  console.log('removed the e2e admin, subscriber, newsletters, queue rows and uploaded images');
}
