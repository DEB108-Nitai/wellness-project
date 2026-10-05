// E2E Phase 4: challenge section (STI/PTI/TTI), registration, contact, newsletter, FAQ, admin registrations + settings/maintenance.
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:3000';
const OUT = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const ADMIN = { email: process.argv[2], password: process.argv[3] };
const email = `p4-${Date.now()}@example.com`;
const step = (m) => console.log(`• ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const page = await launch(9334);
try {
  await page.viewport(1280, 900);

  // 1. Challenge section: order STI → PTI → TTI, three photo slots
  await page.goto(`${BASE}/#60-days-challenge`);
  await page.waitText('Our Three 60-Day');
  const order = await page.eval(`(() => { const t = document.body.innerText;
    return [t.indexOf('Sonic Therapeutic Intervention'), t.indexOf('Philosophical Therapeutic Intervention'), t.indexOf('Transcendental Therapeutic Intervention (TTI)')]; })()`);
  if (!(order[0] < order[1] && order[1] < order[2])) throw new Error('program order is not STI → PTI → TTI: ' + order);
  step('programs appear in order STI → PTI → TTI');
  for (const [id, file] of [['sonic-therapy', '10-sti'], ['philosophical-intervention', '11-pti']]) {
    await page.eval(`document.getElementById('${id}').scrollIntoView()`);
    await sleep(400);
    await page.screenshot(`${OUT}${file}.png`);
  }
  await page.eval(`[...document.querySelectorAll('h3')].find(h => h.innerText.includes('Transcendental Therapeutic Intervention (TTI)')).scrollIntoView()`);
  await sleep(400);
  await page.screenshot(`${OUT}12-tti.png`);

  // 2. Register for PTI
  await page.clickText('Start the PTI Challenge', 'button');
  await page.waitText('Philosophical Therapeutic Intervention 60-Day Challenge');
  await page.fill('#reg-name', 'Kiran Rao');
  await page.fill('#reg-email', email);
  await page.fill('#reg-phone', '+1 512 555 0142');
  await page.fill('#reg-age', '27');
  await page.fill('#reg-city', 'Austin');
  await page.clickText('Evening Track', 'button');
  await page.clickText('Stress & Anxiety', 'button');
  await page.screenshot(`${OUT}13-register-form.png`);
  await sleep(3200); // human-like fill time (spam guard)
  await page.clickText('Confirm 60-Day Challenge Registration', 'button');
  await page.waitText('Please accept to continue');
  step('consent is required');
  await page.eval(`document.querySelector('[role=dialog] input[type=checkbox]').click()`);
  await page.clickText('Confirm 60-Day Challenge Registration', 'button');
  await page.waitText('Registered successfully');
  await page.screenshot(`${OUT}14-registered.png`);
  step('PTI registration → "Registered successfully"');
  await page.clickText('Close', 'button');

  // Duplicate for the same program is refused; another program is allowed.
  await page.clickText('Start the PTI Challenge', 'button');
  await page.fill('#reg-name', 'Kiran Rao');
  await page.fill('#reg-email', email);
  await page.fill('#reg-phone', '+1 512 555 0142');
  await page.eval(`document.querySelector('[role=dialog] input[type=checkbox]').click()`);
  await sleep(3200);
  await page.clickText('Confirm 60-Day Challenge Registration', 'button');
  await page.waitText('already registered for Philosophical');
  step('duplicate PTI registration refused');
  await page.clickText('Sonic (STI)', '[role=dialog] button');
  await page.clickText('Confirm 60-Day Challenge Registration', 'button');
  await page.waitText('Registered successfully');
  step('same person can join STI too');
  await page.clickText('Close', 'button');

  // 3. Contact form, newsletter, FAQ
  await page.goto(`${BASE}/contact`);
  await page.waitFor(`document.querySelector('form input')`);
  await page.eval(`(() => { const ins = [...document.querySelectorAll('form input, form textarea')].filter(e => e.offsetParent !== null);
    return ins.length; })()`);
  await page.fill('form input[type=text]', 'Kiran Rao');
  await page.fill('form input[type=email]', email);
  await page.eval(`(() => { const ta = document.querySelector('form textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(ta, 'Hello! Are the PTI circles available online in Texas?');
    ta.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(3200);
  await page.clickText('Send Message', 'button');
  await page.waitFor(`!document.querySelector('form textarea')`);
  step('contact message sent');

  await page.fill('footer input[type=email]', email);
  await page.clickText('Subscribe', 'footer button');
  await page.waitText('Thank you for subscribing');
  step('newsletter subscribed');

  await page.goto(`${BASE}/faq`);
  await page.waitText('Why do I need an account to see my results?');
  step('FAQs load from the database');

  // 4. Admin: sign in, registrations, settings → maintenance
  await page.goto(`${BASE}/login?next=/admin`);
  await page.fill('input[type=email]', ADMIN.email);
  await page.fill('input[autocomplete=current-password]', ADMIN.password);
  await page.clickText('Sign in', 'button');
  await page.waitText('Wellness Platform Administration');
  await page.waitText('Latest 60-Day registrations');
  await page.screenshot(`${OUT}15-admin-overview.png`);
  await page.clickText('60-Day Challenge Registrations', '[role=tab]');
  await page.waitText('Kiran Rao');
  await page.fill('select[aria-label=Program]', 'PTI');
  await page.waitFor(`document.querySelectorAll('tbody tr').length === 1`);
  await page.screenshot(`${OUT}16-admin-registrations.png`);
  step('admin sees the registration, PTI filter works');
  await page.clickText('Open', 'tbody button');
  await page.fill('[role=dialog] select', 'confirmed');
  await page.clickText('Save changes', 'button');
  await page.waitText('Saved.');
  step('admin confirmed the registration');
  await page.eval(`document.querySelector('[role=dialog] button[aria-label=Close]')?.click()`);

  await page.clickText('System Settings', '[role=tab]');
  await page.waitText('Platform Settings');
  await page.eval(`[...document.querySelectorAll('label')].find(l => l.innerText.includes('Maintenance mode')).querySelector('input').click()`);
  await page.clickText('Save settings', 'button');
  await page.waitText('Settings saved.');
  const status = await page.eval(`fetch('/api/faqs').then(r => r.status)`);
  step(`maintenance on → public API returns ${status} (admin session)`);
  await page.waitText('MAINTENANCE MODE ACTIVE');
  await page.screenshot(`${OUT}17-admin-settings.png`);
  // turn it off again
  await page.eval(`[...document.querySelectorAll('label')].find(l => l.innerText.includes('Maintenance mode')).querySelector('input').click()`);
  await page.clickText('Save settings', 'button');
  await page.waitText('Settings saved.');
  step('maintenance off again');

  console.log(`\nRESULT: PASS (${email})`);
} catch (err) {
  console.error(`\nRESULT: FAIL — ${err.message}`);
  await page.screenshot(`${OUT}FAIL.png`).catch(() => {});
  process.exitCode = 1;
} finally {
  if (page.consoleErrors.length) console.log('Browser console errors:\n  ' + page.consoleErrors.join('\n  '));
  await page.close();
}
