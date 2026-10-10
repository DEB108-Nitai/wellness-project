// E2E: guest takes the assessment → resume after reload → submit → gate → sign up → report → share → My Results.
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:3000';
const OUT = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const email = `e2e${Date.now()}@example.com`;
const step = (m) => console.log(`• ${m}`);

const page = await launch();
try {
  await page.viewport(1280, 900);

  // 1. Consent
  await page.goto(`${BASE}/test`);
  await page.waitText('Before you begin');
  await page.screenshot(`${OUT}01-consent.png`);
  await page.eval(`document.querySelectorAll('input[type=checkbox]').forEach(c => c.click())`);
  await page.clickText('Continue', 'button');
  step('consent accepted');

  // 2. Demographics (validation first)
  await page.waitText('A little about you');
  await page.fill('#age', '16');
  await page.clickText('Begin assessment', 'button');
  await page.waitText('Please enter an age between 18 and 100');
  step('age 16 rejected client-side');
  await page.fill('#country', 'IN');
  await page.fill('#age', '29');
  await page.fill('#gender', 'female');
  await page.fill('#nickname', 'Asha');
  await page.screenshot(`${OUT}02-demographics.png`);
  await page.clickText('Begin assessment', 'button');
  await page.waitText('Statement 1 of 166');
  step('session started');

  // 3. Answer pages; attention checks are read from their wording.
  const answerPage = () => page.eval(`(() => {
    const words = { "Strongly Agree": 5, "Strongly Disagree": 1, "Agree": 4, "Disagree": 2, "Neutral": 3 };
    const sets = [...document.querySelectorAll('fieldset')];
    sets.forEach((fs, i) => {
      const text = fs.querySelector('p').innerText;
      let v = (Number(fs.id.slice(2)) % 5) + 1;
      const m = text.match(/select '([A-Za-z ]+)'/);
      if (m) v = words[m[1]];
      fs.querySelectorAll('[role=radio]')[v - 1].click();
    });
    return sets.length; })()`);

  let pageNo = 1;
  // Try to go next without answering: must be blocked.
  await page.clickText('Next page', 'button');
  await page.waitText('Please choose an answer to continue');
  step('unanswered page blocked');

  for (; pageNo <= 6; pageNo++) {
    await answerPage();
    if (pageNo === 1) {
      await page.viewport(390, 844, true);
      await page.screenshot(`${OUT}03-questions-mobile.png`);
      await page.viewport(1280, 900);
      await page.screenshot(`${OUT}03-questions.png`);
    }
    await page.clickText('Next page', 'button');
    await page.waitText(`Page ${pageNo + 1} of`);
  }
  await page.waitText('Saved ✓', 10000);
  step(`answered ${pageNo - 1} pages, autosaved`);

  // 4. Reload → resume card
  await page.goto(`${BASE}/test`);
  await page.waitText('Assessment in progress');
  await page.screenshot(`${OUT}04-resume.png`);
  const resumeInfo = await page.eval(`document.body.innerText.match(/answered (\\d+) of (\\d+)/)?.slice(1).join('/')`);
  step(`resume card shows ${resumeInfo} answered`);
  await page.clickText('Resume where I left off', 'button');
  await page.waitText('Page 7 of');
  step('resumed on page 7');

  // 5. Remaining pages
  for (;;) {
    await answerPage();
    const last = await page.eval(`[...document.querySelectorAll('button')].some(b => b.innerText.includes('Review answers'))`);
    if (last) {
      await page.clickText('Review answers', 'button');
      break;
    }
    await page.clickText('Next page', 'button');
    
  }
  await page.waitText('Ready to see your profile?');
  await page.screenshot(`${OUT}05-review.png`);
  await page.clickText('Submit and calculate my profile', 'button');
  await page.waitText('Your profile is ready', 20000);
  const ref = await page.eval(`document.body.innerText.match(/TE-[2-9A-HJ-NP-Z]{6}/)[0]`);
  await page.screenshot(`${OUT}06-completed-gate.png`, true);
  step(`submitted ${ref}; results locked for guest`);

  // Guest opening the report URL directly also sees the gate.
  await page.goto(`${BASE}/results/${ref}`);
  await page.waitText('Your profile is ready');
  step('direct report URL is gated for guests');

  // 6. Sign up from the gate → lands on the report
  await page.clickText('Create free account', 'a');
  await page.waitText('Create your free account');
  await page.fill('input[autocomplete=name]', 'Asha Verma');
  await page.fill('input[type=email]', email);
  await page.fill('input[autocomplete=new-password]', 'Calm-River-Lantern-42');
  await page.clickText('Create account', 'button');
  await page.waitText('Personality Report', 20000);
  const url = await page.eval('location.pathname');
  step(`signed up → ${url}`);
  await page.waitText('5 Global Personality Domains');
  await page.screenshot(`${OUT}07-report.png`, true);

  // 7. Share link
  await page.clickText('Share', 'button');
  await page.clickText('Create share link', 'button');
  await page.waitFor(`document.querySelector('input[readonly]')?.value.includes('/r/')`);
  const shareLink = await page.eval(`document.querySelector('input[readonly]').value`);
  step(`share link ${shareLink}`);
  await page.goto(shareLink);
  await page.waitText('This report was shared with you');
  const leaks = await page.eval(`/Age \\d+|India/.test(document.body.innerText)`);
  step(`shared view hides age/country: ${!leaks}`);
  await page.screenshot(`${OUT}08-shared.png`);

  // 8. My Results
  await page.goto(`${BASE}/my-results`);
  await page.waitText(ref);
  await page.screenshot(`${OUT}09-my-results.png`);
  step('My Results lists the report');

  console.log(`\nRESULT: PASS (${email}, ${ref})`);
} catch (err) {
  console.error(`\nRESULT: FAIL — ${err.message}`);
  await page.screenshot(`${OUT}FAIL.png`).catch(() => {});
  process.exitCode = 1;
} finally {
  if (page.consoleErrors.length) console.log('Browser console errors:\n  ' + page.consoleErrors.join('\n  '));
  await page.close();
}
