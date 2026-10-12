// E2E (Phase 5 slice A): an admin adds a research paper in a NEW category and a consultancy project with an
// uploaded image; the home page, Research and Consultancy pages and every count follow; removing them
// restores the numbers. Creates one @example.com admin (promoted with the CLI) — clean it up afterwards.
// Usage: node tests/e2e/admin-content.mjs   (needs XAMPP + npm run dev + Chrome)
import { execFileSync } from 'node:child_process';
import { launch } from './cdp.mjs';
import { finishAdminSignIn } from './admin-signin.mjs';

const BASE = 'http://localhost:3000';
const ROOT = new URL('../../', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const OUT = `${ROOT}tests/e2e/shots/`;
const email = `admin${Date.now()}@example.com`;
const PASSWORD = 'Calm-River-Lantern-42';
const CATEGORY = `Contemplative Attention ${Date.now() % 10000}`;
const PROJECT = `E2E Wellness Portal ${Date.now() % 10000}`;
const step = (m) => console.log(`• ${m}`);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = (page) => page.eval(`fetch('/api/content/stats').then(r => r.json()).then(j => j.data)`);

const page = await launch();
try {
  await page.viewport(1440, 900);
  // 1. A fresh account, promoted to admin from the command line (the only way to create the first admin).
  await page.goto(`${BASE}/signup`);
  await page.waitText('Create your account');
  await page.fill('input[autocomplete=name]', 'E2E Admin');
  await page.fill('input[type=email]', email);
  await page.fill('input[autocomplete=new-password]', PASSWORD);
  await pause(3100);
  await page.clickText('Create account', 'button');
  await page.waitFor(`location.pathname !== '/signup'`, 20000);
  execFileSync('C:/xampp/php/php.exe', [`${ROOT}api/bin/create-admin.php`, email], { input: 'y\n' });
  await finishAdminSignIn(page, BASE, email, PASSWORD); // admins sign in with an authenticator code too (ADM-12)
  step(`signed up and promoted ${email}`);

  const before = await stats(page);
  step(`counts before: ${before.publications} papers · ${before.researchFields} fields · ${before.clientProjects} client projects`);

  // 2. Add a paper in a new category.
  await page.goto(`${BASE}/admin/research`);
  await page.waitText('published papers in'); // data loaded, buttons enabled
  await page.clickText('Add paper', 'button');
  await page.waitText('Add a research paper');
  // Fields are found by their label inside the dialog (the page also has a category filter <select>).
  const fillDialog = (values) => page.eval(`(() => {
    const values = ${JSON.stringify(values)};
    for (const [label, v] of Object.entries(values)) {
      const l = [...document.querySelectorAll('[role=dialog] label')].find(x => x.innerText.trim().startsWith(label));
      const el = document.getElementById(l.htmlFor);
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : el.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      el.dispatchEvent(new Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    }
  })()`);
  await fillDialog({
    'Title or full citation': 'Das, V. and Bhasin, M., 2026. Calm attention in everyday practice. Journal of E2E Studies, 1(1), pp. 1–9.',
    Category: 'new',
  });
  await page.waitText('New category name');
  await fillDialog({ 'New category name': CATEGORY, 'Tagline (optional)': 'How practice shapes attention.', 'Link to the paper': 'https://example.org/calm-attention' });
  await page.screenshot(`${OUT}admin-01-add-paper.png`);
  await page.clickText('Add paper', '[role=dialog] button');
  await page.waitText('It now has its own card on the home page');
  let now = await stats(page);
  if (now.publications !== before.publications + 1 || now.researchFields !== before.researchFields + 1) throw new Error(`counts did not follow: ${JSON.stringify(now)}`);
  step('paper added in a new category; publications +1 and fields +1');
  await page.screenshot(`${OUT}admin-02-research.png`);

  // 3. The public site follows.
  await page.goto(`${BASE}/`);
  await page.waitText(`${now.publications} publications · ${now.researchFields} research fields`);
  await page.waitText(`After ${now.publications} publications`);
  await page.waitText(`${now.researchFields} fields of research behind everything we build`);
  await page.waitText(CATEGORY);
  step('home page: hero sentence, foundation stat, section heading and a new sliding card all updated');
  await page.goto(`${BASE}/research`);
  await page.waitText(`${now.publications} publications across ${now.researchFields} fields`);
  await page.waitText('Calm attention in everyday practice');
  step('research page lists the new field and paper');

  // 4. Add a consultancy project with an uploaded image.
  await page.goto(`${BASE}/admin/consultancy`);
  await page.waitText('published client projects');
  await page.clickText('Add project', 'button');
  await page.waitText('Add a consultancy project');
  await fillDialog({
    'Project name': PROJECT,
    'Client name': 'E2E Hospital Trust',
    Description: 'A patient portal with appointments, reports and reminders.',
  });
  const { root } = await page.send('DOM.getDocument');
  const { nodeId } = await page.send('DOM.querySelector', { nodeId: root.nodeId, selector: '#project-image' });
  await page.send('DOM.setFileInputFiles', { nodeId, files: [`${ROOT}public/images/projects/salpg.webp`.replace(/\//g, '\\')] });
  await page.waitFor(`!!document.querySelector('[role=dialog] img[alt="Project image preview"]')?.src.includes('/uploads/projects/')`, 15000);
  step('image uploaded and previewed');
  await page.screenshot(`${OUT}admin-03-add-project.png`);
  await page.clickText('Add project', '[role=dialog] button');
  await page.waitText('Project added to the Consultancy page');
  now = await stats(page);
  if (now.clientProjects !== before.clientProjects + 1 || !now.clients.includes('E2E Hospital Trust')) throw new Error(`project counts did not follow: ${JSON.stringify(now)}`);
  await page.goto(`${BASE}/consultancy`);
  await page.waitText(PROJECT);
  await page.waitText('E2E Hospital Trust');
  await page.waitFor(`[...document.images].some(i => i.src.includes('/uploads/projects/') && i.complete && i.naturalWidth > 0)`, 10000);
  step('consultancy page shows the project, its uploaded image and the new client');

  // 5. Phone width check of the admin screens.
  await page.viewport(390, 844, true);
  await page.goto(`${BASE}/admin/research`);
  await page.waitText('Research papers');
  await page.screenshot(`${OUT}admin-04-research-mobile.png`);
  await page.goto(`${BASE}/admin/consultancy`);
  await page.waitText(PROJECT);
  await page.screenshot(`${OUT}admin-05-consultancy-mobile.png`);
  const overflow = await page.eval(`document.documentElement.scrollWidth > window.innerWidth + 1`);
  if (overflow) throw new Error('horizontal scroll at 390 px');
  await page.viewport(1440, 900);

  // 6. Remove both again (through the UI) and the numbers return.
  await page.goto(`${BASE}/admin/consultancy`);
  await page.waitText(PROJECT);
  await page.eval(`document.querySelector('[aria-label="Remove ${PROJECT}"]').click()`);
  await page.clickText('Remove project', '[role=dialog] button');
  await page.waitText('Project removed.');
  await page.goto(`${BASE}/admin/research`);
  await page.waitText(CATEGORY);
  await page.eval(`document.querySelector('[aria-label="Delete paper"]') && [...document.querySelectorAll('section')].find(s => s.getAttribute('aria-label') === ${JSON.stringify(CATEGORY)}).querySelector('[aria-label="Delete paper"]').click()`);
  await page.clickText('Delete', '[role=dialog] button');
  await page.waitText('Paper deleted.');
  await page.clickText('Categories', '[role=tab]');
  await page.eval(`document.querySelector('[aria-label="Delete ${CATEGORY}"]').click()`);
  await page.clickText('Delete', '[role=dialog] button');
  await page.waitText('Category deleted.');
  now = await stats(page);
  if (JSON.stringify(now) !== JSON.stringify(before)) throw new Error(`counts not restored: ${JSON.stringify(now)}`);
  step('removed again: counts back to the starting numbers');

  console.log(`\nRESULT: PASS (${email})`);
} catch (err) {
  console.error(`\nRESULT: FAIL — ${err.message}`);
  await page.screenshot(`${OUT}FAIL.png`).catch(() => {});
  process.exitCode = 1;
} finally {
  if (page.consoleErrors.length) console.log('Browser console errors:\n  ' + page.consoleErrors.join('\n  '));
  await page.close();
}
