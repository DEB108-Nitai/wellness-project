// Screenshots of the three 60-Day program blocks at desktop and phone widths (visual check).
// Usage (dev server running): node tests/e2e/challenge-shots.mjs  → tests/e2e/shots/{desktop,mobile}-{sti,pti,tti}.png
import { writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const OUT = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FIND = {
  sti: `document.querySelector('#sonic-therapy')`,
  pti: `document.querySelector('#philosophical-intervention')`,
  tti: `[...document.querySelectorAll('h3')].find(h => h.innerText.includes('(TTI)')).closest('.rounded-3xl')`,
};

const page = await launch(9335);
try {
  for (const [w, mobile, tag] of [[1440, false, 'desktop'], [390, true, 'mobile']]) {
    await page.viewport(w, 900, mobile);
    await page.goto('http://localhost:3000/');
    await page.waitText('Our Three 60-Day');
    // Hide the sticky navbar and cookie notice so they don't cover the blocks.
    await page.eval(`document.querySelector('header').style.display = 'none';
      [...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Got it')?.click()`);
    for (const [name, find] of Object.entries(FIND)) {
      const height = await page.eval(`Math.ceil(${find}.getBoundingClientRect().height)`);
      await page.viewport(w, height, mobile);
      await page.eval(`window.scrollTo(0, ${find}.getBoundingClientRect().top + window.scrollY)`);
      await sleep(400);
      const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(`${OUT}${tag}-${name}.png`, Buffer.from(data, 'base64'));
    }
  }
  console.log('done');
} finally {
  await page.close();
}
