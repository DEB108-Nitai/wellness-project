// After finishing the test, Back walks out of it: the result is shown on the test's start entry, so one Back goes
// home, instead of stopping on stale statement pages (owner report, 2026-10-21).
// Usage: node tests/e2e/back-after-test.mjs   (needs XAMPP + npm run dev + Chrome). Deletes its test session.
import { execFileSync } from 'node:child_process';
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:3000';
const MYSQL = process.env.MYSQL_BIN ?? 'C:/xampp/mysql/bin/mysql.exe';
const step = (m) => console.log(`• ${m}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const page = await launch(9361);
let ref = null;
try {
  await page.viewport(1280, 900);
  await page.goto(`${BASE}/`);
  await page.waitText('Transcend all obstacles');
  await page.eval(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Got it')?.click()`);
  await page.eval(`[...document.querySelectorAll('a')].find(a => a.getAttribute('href') === '/test')?.click()`);
  await page.waitText('Before you begin');
  step('home → test start page (in-app link)');

  await page.eval(`document.querySelectorAll('input[type=checkbox]').forEach(c => c.click())`);
  await page.clickText('Continue', 'button');
  await page.waitText('A little about you');
  for (const [sel, v] of [['#country', 'IN'], ['#age', '27'], ['#gender', 'male'], ['#nickname', 'Rohan'], ['#education', 'bachelors'], ['#occupation', 'Engineer']]) {
    await page.fill(sel, v);
  }
  await page.clickText('Begin assessment', 'button');
  await page.waitText('Statement 1 of 166');

  const answerPage = () => page.eval(`(() => {
    const words = { "Strongly Agree": 5, "Strongly Disagree": 1, "Agree": 4, "Disagree": 2, "Neutral": 3 };
    document.querySelectorAll('fieldset').forEach((fs) => {
      let v = (Number(fs.id.slice(2)) % 5) + 1;
      const m = fs.querySelector('p').innerText.match(/select '([A-Za-z ]+)'/);
      if (m) v = words[m[1]];
      fs.querySelectorAll('[role=radio]')[v - 1].click();
    }); })()`);
  for (;;) {
    await answerPage();
    if (await page.eval(`[...document.querySelectorAll('button')].some(b => b.innerText.includes('Review answers'))`)) {
      await page.clickText('Review answers', 'button');
      break;
    }
    await page.clickText('Next page', 'button');
    await sleep(150);
  }
  await page.waitText('Ready to see your profile?');
  await page.clickText('Submit and calculate my profile', 'button');
  await page.waitText('Your profile is ready', 20000);
  ref = await page.eval(`document.body.innerText.match(/TE-[2-9A-HJ-NP-Z]{6}/)[0]`);
  const depth = await page.eval('history.length');
  step(`test submitted (${ref}); ${depth} history entries in this tab`);
  await sleep(800);
  const atFinish = await page.eval(`location.pathname + location.search`);
  if (atFinish !== '/test') throw new Error(`finished test shown at ${atFinish}, expected /test`);
  step('finished test shown on the start entry (/test)');

  // Press Back until home, at most 4 times, letting each press settle like a person would.
  const seen = [];
  for (let i = 1; i <= 4; i++) {
    await page.eval('history.back()');
    await sleep(2500);
    const where = await page.eval(`location.pathname + location.search`);
    const screen = await page.eval(`document.body.innerText.includes('Before you begin') ? 'test start page' : document.body.innerText.includes('Transcend all obstacles') ? 'home' : 'other'`);
    seen.push(`${where} (${screen})`);
    if (where === '/' && screen === 'home') break;
  }
  step(`Back presses: ${seen.join(' → ')}`);
  if (!seen.at(-1).startsWith('/ (home)')) throw new Error('Back did not reach the home page within 4 presses');
  if (seen.length !== 1) throw new Error('more than one Back press was needed from the finished test');
  console.log('\nRESULT: PASS');
} catch (e) {
  console.log(`\nRESULT: FAIL — ${e.message}`);
  process.exitCode = 1;
} finally {
  await page.close();
  if (ref) {
    execFileSync(MYSQL, ['-uroot', 'transenigma', '-e', `DELETE FROM test_sessions WHERE public_ref = '${ref}'`]);
    console.log(`removed test session ${ref}`);
  }
}
