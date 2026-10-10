// Research page (/research): 15 fields, 97 publications, deep links (/research#slug), sidebar/chips, search.
// Read-only: creates no database rows. Usage (dev server running): node tests/e2e/research-page.mjs → shots/research-*.png
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:3000';
const SHOTS = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}`);
  if (!ok) failures++;
};
const pubCount = `document.querySelectorAll('section[id] > ol > li').length`;
const topOf = (id) => `Math.round(document.getElementById(${JSON.stringify(id)}).getBoundingClientRect().top)`;
const typeSearch = async (text) => {
  await page.eval(`(() => { const i = document.getElementById('research-search'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ${JSON.stringify(text)}); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await sleep(300);
};

const page = await launch(9340);
const open = async (path) => {
  await page.goto(`${BASE}${path}`);
  await page.waitFor(`document.querySelectorAll('section[id] > ol > li').length > 0`, 10000);
  await page.eval(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Got it')?.click()`);
  await sleep(600);
};

try {
  // ---------------------------------------------------------------- desktop
  await page.viewport(1440, 900);
  await open('/research');
  check(await page.eval(`document.querySelectorAll('main section[id], section[id][aria-labelledby$="-title"]').length`) >= 15, '15 research fields');
  check((await page.eval(pubCount)) === 97, '97 publications');
  check(await page.eval(`document.querySelectorAll('h1').length === 1`), 'one h1');
  check(await page.eval(`/97 publications across 15 fields/.test(document.body.innerText)`), 'header shows the live totals');
  check(await page.eval(`[...document.querySelectorAll('header nav[aria-label=Main] button')].find(b => b.innerText.trim() === 'Research')?.className.includes('border-teal-600')`), 'Research tab is active');
  check(await page.eval(`getComputedStyle(document.querySelectorAll('nav[aria-label="Research fields"]')[1]).display !== 'none'`), 'desktop shows the field sidebar');
  const years = await page.eval(`[...document.querySelectorAll('[id="sankhya-vedic-psychology-ayurveda"] ol > li > span')].map(s => s.innerText)`);
  check(years[0] === '2024' && years[years.length - 1] === '2013', 'newest first within a field');
  const links = await page.eval(`(() => [...document.querySelectorAll('a')].filter(a => a.innerText.includes('Read the paper')).map(a => [a.target, a.rel, a.href]))()`);
  check(links.length === 26, `26 papers have a "Read the paper" link (got ${links.length})`);
  check(links.every(([t, rel, href]) => t === '_blank' && rel.includes('noopener') && href.startsWith('https://')), 'paper links open safely in a new tab');
  await page.screenshot(`${SHOTS}research-1440.png`);

  // Sidebar jump updates the hash, scrolls, and highlights the field.
  await page.eval(`[...document.querySelectorAll('nav[aria-label="Research fields"] button')].filter(b => b.offsetParent).find(b => b.innerText.startsWith('Materials Science')).click()`);
  await sleep(1800);
  check(await page.eval(`location.hash === '#materials-science-computational-materials'`), 'sidebar click sets /research#slug');
  const t = await page.eval(topOf('materials-science-computational-materials'));
  check(t >= 60 && t < 220, `field heading lands below the header (top ${t}px)`);
  check(await page.eval(`[...document.querySelectorAll('nav[aria-label="Research fields"] button[aria-current="true"]')].some(b => b.innerText.startsWith('Materials Science'))`), 'sidebar highlights the field in view');
  await page.screenshot(`${SHOTS}research-1440-jump.png`);

  // Scroll-spy: scrolling through the papers keeps the highlighted field in step with the section being read.
  const spy = async (label) => {
    const wrong = await page.eval(`(async () => {
      const wait = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const sections = [...document.querySelectorAll('section[id][aria-labelledby$="-title"]')];
      const max = document.documentElement.scrollHeight - innerHeight;
      const bad = [];
      for (let y = 0; y <= max - 40; y += 90) {
        scrollTo(0, y); await wait();
        const reading = sections.find(s => { const r = s.getBoundingClientRect(); return r.top <= 180 && r.bottom > 180; });
        const shown = [...document.querySelectorAll('nav[aria-label="Research fields"] button[aria-current="true"]')].filter(b => b.offsetParent).map(b => b.dataset.slug);
        if (reading && !shown.includes(reading.id)) bad.push(y + ':' + reading.id + '≠' + shown.join(','));
      }
      scrollTo(0, max); await wait(); await wait();
      const last = [...document.querySelectorAll('nav[aria-label="Research fields"] button[aria-current="true"]')].filter(b => b.offsetParent).map(b => b.dataset.slug);
      if (!last.includes(sections[sections.length - 1].id)) bad.push('bottom≠last field');
      return bad;
    })()`);
    check(wrong.length === 0, `${label}: highlight follows the section being read${wrong.length ? ' — ' + wrong.slice(0, 4).join(' | ') : ''}`);
  };
  await page.eval(`window.scrollTo(0, 0)`);
  await spy('desktop');

  // Deep link from elsewhere (what the home-page cards will use).
  await page.goto(`${BASE}/`);
  await page.waitText('Transcend the enigma');
  await page.goto(`${BASE}/research#drug-discovery`);
  await page.waitFor(`document.getElementById('drug-discovery')`, 10000);
  await sleep(1800);
  const d = await page.eval(topOf('drug-discovery'));
  check(d >= 60 && d < 220, `/research#drug-discovery lands on that field (top ${d}px)`);

  // Search.
  await typeSearch('llama');
  check((await page.eval(pubCount)) === 1 && (await page.eval(`/1 publication found/.test(document.body.innerText)`)), 'search "llama" finds the 1 matching paper');
  await typeSearch('kleptocracy nigeria');
  const k = await page.eval(pubCount);
  check(k >= 3 && k < 10, `multi-word search narrows results (${k})`);
  await typeSearch('zzzz-no-match');
  check(await page.eval(`/No publications match your search/.test(document.body.innerText)`), 'no-match message');
  await page.eval(`document.querySelector('[aria-label="Clear search"]').click()`);
  await sleep(300);
  check((await page.eval(pubCount)) === 97, 'clear restores all 97');

  // Home-page Research card links here.
  await page.goto(`${BASE}/`);
  await page.waitText('Explore our research');
  await page.clickText('Explore our research', 'button');
  await page.waitFor(`location.pathname === '/research'`);
  check(true, 'home "Explore our research" opens /research');

  // ---------------------------------------------------------------- smaller widths
  for (const [w, h] of [[768, 1024], [390, 844], [360, 780]]) {
    await page.viewport(w, h, true);
    await open('/research');
    check(await page.eval(`document.documentElement.scrollWidth <= innerWidth`), `${w}px has no horizontal page scroll`);
    check(await page.eval(`getComputedStyle(document.querySelector('nav[aria-label="Research fields"]')).display !== 'none'`), `${w}px shows the field chips`);
    await page.screenshot(`${SHOTS}research-${w}.png`);
  }
  // Phone chip jump.
  await page.viewport(390, 844, true);
  await open('/research');
  await page.eval(`[...document.querySelectorAll('nav[aria-label="Research fields"] button')].find(b => b.innerText.startsWith('Education')).click()`);
  await sleep(1800);
  const e = await page.eval(topOf('education-learning-human-development'));
  check(e >= 100 && e < 260, `phone chip jump lands below the sticky chips (top ${e}px)`);
  await page.screenshot(`${SHOTS}research-390-jump.png`);
  await spy('phone');

  check(page.consoleErrors.length === 0, `no console errors${page.consoleErrors.length ? ': ' + page.consoleErrors.join(' | ') : ''}`);
  // A malformed link such as /research#% must not crash the page (hash decoding is guarded).
  await page.goto(`${BASE}/research#%`);
  await page.waitText("Drug Discovery", 8000).catch(() => {});
  check(await page.eval(`document.body.innerText.includes("Drug Discovery") && !!document.querySelector('h1')`), '/research#% still renders');
} finally {
  await page.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll research-page checks passed');
process.exit(failures ? 1 : 0);
