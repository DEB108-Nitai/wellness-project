// E2E: test edge cases found by the owner (2026-10-11).
// 1. Guest finishes → "I already have an account" → "Back to home": the result is still findable,
//    and signing up later without a `next` link opens it.
// 2. The browser Back button steps back through statement pages.
// 3. A test restarted in "another tab" stops saving here and says why.
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:3000';
const OUT = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const email = `edge${Date.now()}@example.com`;
const step = (m) => console.log(`• ${m}`);
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const answerPage = (page) => page.eval(`(() => {
  const words = { "Strongly Agree": 5, "Strongly Disagree": 1, "Agree": 4, "Disagree": 2, "Neutral": 3 };
  document.querySelectorAll('fieldset').forEach((fs) => {
    let v = (Number(fs.id.slice(2)) % 5) + 1;
    const m = fs.querySelector('p').innerText.match(/select '([A-Za-z ]+)'/);
    if (m) v = words[m[1]];
    fs.querySelectorAll('[role=radio]')[v - 1].click();
  }); })()`);

async function startTest(page) {
  await page.goto(`${BASE}/test`);
  await page.waitText('Before you begin');
  await page.eval(`document.querySelectorAll('input[type=checkbox]').forEach(c => c.click())`);
  await page.clickText('Continue', 'button');
  await page.waitText('A little about you');
  await page.fill('#country', 'IN');
  await page.fill('#age', '29');
  await page.fill('#gender', 'female');
  await page.clickText('Begin assessment', 'button');
  await page.waitText('Statement 1 of 166');
}

const page = await launch();
try {
  await page.viewport(1280, 900);

  // ---------------------------------------------------------------- 1. the owner's path
  await startTest(page);
  for (;;) {
    await answerPage(page);
    const last = await page.eval(`[...document.querySelectorAll('button')].some(b => b.innerText.includes('Review answers'))`);
    if (last) break;
    await page.clickText('Next page', 'button');
  }
  await page.clickText('Review answers', 'button');
  await page.waitText('Ready to see your profile?');
  await page.clickText('Submit and calculate my profile', 'button');
  await page.waitText('Your profile is ready', 20000);
  const ref = await page.eval(`document.body.innerText.match(/TE-[2-9A-HJ-NP-Z]{6}/)[0]`);
  step(`guest submitted ${ref}`);

  await page.clickText('I already have an account', 'a');
  await page.waitText('Welcome back');
  await page.clickText('Back to home', 'a');
  await page.waitFor(`location.pathname === '/'`);
  await page.waitText('See my result');
  step('after "Back to home" the navbar offers "See my result"');

  await page.goto(`${BASE}/test`);
  await page.waitText('You finished the assessment on');
  await page.screenshot(`${OUT}edge-01-pending-result.png`);
  step('/test shows the "Your profile is ready" card');

  // Sign up later from the navbar (no `next` link): lands on the report.
  await page.goto(`${BASE}/signup`);
  await page.waitText('Create your account');
  await page.fill('input[autocomplete=name]', 'Edge Case');
  await page.fill('input[type=email]', email);
  await page.fill('input[autocomplete=new-password]', 'Calm-River-Lantern-42');
  await page.clickText('Create account', 'button');
  await page.waitFor(`location.pathname === '/results/${ref}'`, 20000);
  await page.waitText('Personality Report', 20000);
  step(`signing up without a link opened /results/${ref}`);

  // ---------------------------------------------------------------- 2. Back button through pages
  await startTest(page);
  await answerPage(page);
  await page.clickText('Next page', 'button');
  await page.waitText('Page 2 of');
  await answerPage(page);
  await page.clickText('Next page', 'button');
  await page.waitText('Page 3 of');
  await page.eval('history.back()');
  await page.waitText('Page 2 of');
  await page.eval('history.back()');
  await page.waitText('Page 1 of');
  step('Back goes 3 → 2 → 1');
  await page.eval('history.back()');
  await page.waitText('Assessment in progress');
  step('Back from page 1 shows the "in progress" card');

  // ---------------------------------------------------------------- 3. restarted in another tab
  await page.clickText('Resume where I left off', 'button');
  await page.waitText('Page 3 of');
  // "Another tab" clicks Start over: same browser cookies, straight to the API.
  await page.eval(`(async () => {
    const me = await (await fetch('/api/auth/me')).json();
    await fetch('/api/test/session/abandon', { method: 'POST', headers: { 'X-CSRF-Token': me.data.csrfToken } });
  })()`);
  await pause(300);
  await answerPage(page);
  await page.waitText('This assessment was restarted', 10000);
  await page.screenshot(`${OUT}edge-02-restarted.png`);
  step('a test restarted elsewhere stops saving here and says why');

  // ---------------------------------------------------------------- 4. Sign out mid-test leaves nothing behind
  await page.clickText('Go to the current test', 'button');
  await page.waitText('Before you begin');
  await startTest(page);
  await answerPage(page);
  const perPage = await page.eval(`document.querySelectorAll('fieldset').length`);
  // Straight away, before the autosave pause: the answers are only on this device so far.
  const before = await page.eval(`Object.keys(localStorage).filter(k => k.startsWith('te_pending_')).length`);
  await page.clickText('Edge Case', 'button');
  await page.clickText('Sign Out', 'button');
  await page.waitText('Sign In');
  const left = await page.eval(`Object.keys(localStorage).filter(k => k.startsWith('te_pending_')).length`);
  if (left !== 0) throw new Error(`${left} unsent-answer entries left after sign-out`);
  step(`sign-out left no answers on the device (${before} pending before)`);

  await page.goto(`${BASE}/login`);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'Calm-River-Lantern-42');
  await page.clickText('Sign in', 'button');
  await page.waitFor(`location.pathname !== '/login'`);
  const saved = await page.eval(`fetch('/api/test/session').then(r => r.json()).then(j => j.data.answeredCount)`);
  if (saved !== perPage) throw new Error(`expected ${perPage} answers saved to the account, got ${saved}`);
  step(`the ${saved} answers given just before signing out were saved to the account`);

  console.log(`\nRESULT: PASS (${email}, ${ref})`);
} catch (err) {
  console.error(`\nRESULT: FAIL — ${err.message}`);
  await page.screenshot(`${OUT}FAIL.png`).catch(() => {});
  process.exitCode = 1;
} finally {
  if (page.consoleErrors.length) console.log('Browser console errors:\n  ' + page.consoleErrors.join('\n  '));
  await page.close();
}
