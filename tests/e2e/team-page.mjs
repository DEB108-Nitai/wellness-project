// Our Team page (/team): six people in the old-homepage order, photos load, layout at 4 widths, nav tab, contact button.
// Read-only: creates no database rows. Usage (dev server running): node tests/e2e/team-page.mjs → shots/team-*.png
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:3000';
const SHOTS = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}`);
  if (!ok) failures++;
};
const NAMES = ['Dr. Vasudev Das', 'Dr. Mayank Bhasin', 'Dr. Deepshikha Singh', 'Dr. Harshit', 'Praveen Kumar Killaka', 'Gulshan Chandrakar'];

const page = await launch(9339);
try {
  for (const [w, h, mobile, cols] of [[1440, 900, false, 3], [768, 1024, true, 2], [390, 844, true, 1], [360, 780, true, 1]]) {
    await page.viewport(w, h, mobile);
    await page.goto(`${BASE}/team`);
    await page.waitText('Gulshan Chandrakar');
    await page.eval(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Got it')?.click()`);
    // Load every lazy photo before measuring.
    await page.eval(`window.scrollTo(0, document.body.scrollHeight)`);
    await page.waitFor(`[...document.querySelectorAll('section[aria-label="Team members"] img')].every(i => i.complete && i.naturalWidth > 0)`, 8000).catch(() => {});
    await page.eval(`window.scrollTo(0, 0)`);
    await sleep(500);
    if (w === 1440) {
      const names = await page.eval(`[...document.querySelectorAll('section[aria-label="Team members"] h2')].map(e => e.innerText)`);
      check(JSON.stringify(names) === JSON.stringify(NAMES), 'six people in the old-homepage order');
      check(await page.eval(`[...document.querySelectorAll('section[aria-label="Team members"] img')].every(i => i.complete && i.naturalWidth > 0)`), 'all six photos load');
      check(await page.eval(`document.querySelectorAll('h1').length === 1 && document.querySelector('h1').innerText.includes('people behind Transenigma')`), 'one h1');
      check(await page.eval(`[...document.querySelectorAll('header nav[aria-label=Main] button')].find(b => b.innerText.trim() === 'Our Team')?.className.includes('border-teal-600')`), 'Our Team tab is active');
      check(await page.eval(`!document.body.innerText.toLowerCase().includes('workshop')`), 'no workshop mentors listed');
    }
    const perRow = await page.eval(`(() => { const t = [...document.querySelectorAll('section[aria-label="Team members"] > ul > li')].map(li => Math.round(li.getBoundingClientRect().top)); return t.filter(x => x === t[0]).length; })()`);
    check(perRow === cols, `${w}px shows ${cols} per row (got ${perRow})`);
    check(await page.eval(`document.documentElement.scrollWidth <= innerWidth`), `${w}px has no horizontal page scroll`);
    await page.screenshot(`${SHOTS}team-${w}.png`);
    if (w === 1440) {
      await page.eval(`window.scrollTo(0, 650)`);
      await sleep(400);
      await page.screenshot(`${SHOTS}team-1440-grid.png`);
    }
  }

  await page.viewport(1440, 900);
  await page.goto(`${BASE}/`);
  await page.waitText('Transcend the enigma');
  await page.eval(`[...document.querySelectorAll('header nav[aria-label=Main] button')].find(b => b.innerText.trim() === 'Our Team').click()`);
  await page.waitFor(`location.pathname === '/team'`);
  check(true, 'nav tab opens /team');
  await page.waitText('Gulshan Chandrakar');
  await page.clickText('Contact us', 'button');
  await page.waitFor(`location.pathname === '/contact'`);
  check(true, 'Contact us opens /contact');

  check(page.consoleErrors.length === 0, `no console errors${page.consoleErrors.length ? ': ' + page.consoleErrors.join(' | ') : ''}`);
} finally {
  await page.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll team-page checks passed');
process.exit(failures ? 1 : 0);
