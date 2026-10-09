// Home page order: dark Transenigma intro → Research/Consultancy/Programs → 16PF assessment → 60-day programs.
// Read-only: creates no database rows.
// Usage (dev server running): node tests/e2e/home-top.mjs  → screenshots in tests/e2e/shots/home-*.png
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:3000';
const SHOTS = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}`);
  if (!ok) failures++;
};

const page = await launch(9338);
const open = async (w, h, mobile) => {
  await page.viewport(w, h, mobile);
  await page.goto(`${BASE}/`);
  await page.waitText('Transcend the enigma');
  await page.eval(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Got it')?.click()`);
  await sleep(800);
};
const topOf = (expr) => `Math.round((${expr}).getBoundingClientRect().top + scrollY)`;
const heading = (text) => `[...document.querySelectorAll('h1, h2')].find(h => h.innerText.includes(${JSON.stringify(text)}))`;

try {
  for (const [w, h, mobile] of [[1440, 900, false], [768, 1024, true], [390, 844, true], [360, 780, true]]) {
    await open(w, h, mobile);
    if (w === 1440) {
      check(await page.eval(`document.querySelectorAll('h1').length === 1 && document.querySelector('h1').id === 'company-hero-title'`), 'exactly one h1: the Transenigma intro');
      const tops = await page.eval(`[${[
        `document.querySelector('[aria-labelledby=company-hero-title]')`,
        `document.querySelector('[aria-labelledby=foundation-title]')`,
        heading('Scientific 16 Personality'),
        `document.getElementById('60-days-challenge')`,
      ].map(topOf).join(',')}]`);
      check(tops.every((t, i) => i === 0 || t > tops[i - 1]), 'order: intro → foundation → 16PF → programs');
      const cards = await page.eval(`[...document.querySelectorAll('[aria-labelledby=foundation-title] h3')].map(h => h.innerText)`);
      check(cards.join('|') === 'Science, published.|Technology, delivered.|Lives, transformed.', 'foundation cards: Research, Consultancy, Programs');
      check(await page.eval(`!document.getElementById('program-slides') && !document.getElementById('our-programs')`), 'no duplicate program cards at the top');
      const btns = await page.eval(`[...document.querySelectorAll('[aria-labelledby=company-hero-title] button')].map(b => b.innerText.trim())`);
      check(/personality assessment/.test(btns[0]) && btns[1] === 'Explore our programs', 'assessment button comes before programs button');
      check(await page.eval(`!document.body.innerText.includes('IIT Kharagpur')`), 'no team/institute line on the home page');
      check(await page.eval(`!/workshop/i.test(document.body.innerText)`), 'no workshops mentioned on the home page');
      check(await page.eval(`!document.getElementById('factors-grid') && !document.querySelector('main .lucide-sparkles, header .lucide-sparkles, footer .lucide-sparkles')`), 'no factor-card grid and no sparkle icons');
      const heroH = await page.eval(`document.querySelector('[aria-labelledby=company-hero-title]').offsetHeight`);
      check(heroH < 900, `dark intro stays compact (${heroH}px)`);
    }
    check(await page.eval(`document.documentElement.scrollWidth <= innerWidth`), `${w}px has no horizontal page scroll`);
    await page.eval(`window.scrollTo(0, 0)`);
    await sleep(400);
    await page.screenshot(`${SHOTS}home-${w}-intro.png`);
    await page.eval(`window.scrollTo(0, document.querySelector('[aria-labelledby=foundation-title]').getBoundingClientRect().top + scrollY - 70)`);
    await sleep(500);
    await page.screenshot(`${SHOTS}home-${w}-foundation.png`);
    await page.eval(`window.scrollTo(0, ${heading('Scientific 16 Personality')}.closest('section').getBoundingClientRect().top + scrollY - 70)`);
    await sleep(500);
    await page.screenshot(`${SHOTS}home-${w}-assessment.png`);
  }

  // Intro buttons.
  await open(1440, 900, false);
  await page.clickText('Explore our programs', 'button');
  await sleep(1500);
  check(await page.eval(`Math.abs(document.getElementById('60-days-challenge').getBoundingClientRect().top) < 120`), 'Explore our programs scrolls to the programs');
  await page.eval(`window.scrollTo(0, 0)`);
  await page.eval(`document.querySelector('[aria-labelledby=company-hero-title] button').click()`);
  await page.waitFor(`location.pathname === '/test'`);
  check(true, 'assessment button opens /test');

  check(page.consoleErrors.length === 0, `no console errors${page.consoleErrors.length ? ': ' + page.consoleErrors.join(' | ') : ''}`);
} finally {
  await page.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll home-page checks passed');
process.exit(failures ? 1 : 0);
