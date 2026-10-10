// Homepage research cards (S7b): 15 field cards below the programs, linking to /research#slug; CSS marquee on
// wide screens (pauses on hover and keyboard focus, still with reduced motion); swipe row on phones.
// Read-only: creates no database rows. Usage (dev server running): node tests/e2e/home-research.mjs → shots/home-research-*.png
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:3000';
const SHOTS = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}`);
  if (!ok) failures++;
};

const api = (await (await fetch(`${BASE}/api/content/research`)).json()).data;
const SECTION = `document.querySelector('section[aria-labelledby="research-fields-title"]')`;
const TRACK = `${SECTION}.querySelector('.research-marquee > div')`;
const offset = `new DOMMatrix(getComputedStyle(${TRACK}).transform).m41`;

const page = await launch(9343);
const open = async (w, h, mobile, reduce = false) => {
  await page.viewport(w, h, mobile);
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduce ? 'reduce' : 'no-preference' }] });
  await page.goto(`${BASE}/`);
  await page.waitText('Fifteen fields of research');
  await page.eval(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Got it')?.click()`);
  await page.waitFor(`${SECTION}.querySelectorAll('ul[aria-label="Research fields"] > li').length > 0`);
  await page.eval(`${SECTION}.scrollIntoView({ block: 'center' })`);
  await sleep(600);
};

try {
  // Desktop: content, order, links, motion.
  await open(1440, 900, false);
  const cards = await page.eval(`[...${SECTION}.querySelectorAll('ul[aria-label="Research fields"] a')].map(a => [a.getAttribute('href'), a.querySelector('h3').innerText, a.innerText])`);
  check(cards.length === 15, `15 field cards (got ${cards.length})`);
  check(JSON.stringify(cards.map((c) => c[0])) === JSON.stringify(api.categories.map((c) => `/research#${c.slug}`)), 'cards link to /research#slug in the Research page order');
  check(cards.every((c, i) => c[1] === api.categories[i].name && c[2].includes(`${api.categories[i].count} paper`)), 'names and paper counts match the API');
  check(api.categories.every((c) => c.tagline) && cards.every((c, i) => c[2].includes(api.categories[i].tagline)), 'every card shows its approved one-line summary');
  check(await page.eval(`${SECTION}.compareDocumentPosition(document.getElementById('60-days-challenge')) === Node.DOCUMENT_POSITION_PRECEDING`), 'section sits below Our Programs');
  check(await page.eval(`(() => { const c = ${SECTION}.querySelector('ul[aria-hidden="true"]'); return !!c && [...c.querySelectorAll('a')].every(a => a.tabIndex === -1); })()`), 'marquee copy is hidden from screen readers and the Tab key');
  check(await page.eval(`!${SECTION}.querySelector('svg.lucide-sparkles')`), 'no sparkle icons');

  const a = await page.eval(offset); await sleep(1200); const b = await page.eval(offset);
  check(b < a, `row glides on wide screens (${a.toFixed(1)} → ${b.toFixed(1)}px)`);
  const box = await page.eval(`(() => { const r = ${SECTION}.querySelector('ul[aria-label="Research fields"] li').getBoundingClientRect(); return [r.x + 40, r.y + 60]; })()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.max(60, box[0]), y: box[1], button: 'none' });
  await sleep(300); const h1 = await page.eval(offset); await sleep(1000); const h2 = await page.eval(offset);
  check(Math.abs(h2 - h1) < 0.5, 'row pauses on hover');
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 5, y: 5, button: 'none' });
  await page.eval(`${SECTION}.querySelector('ul[aria-label="Research fields"] a').focus({ preventScroll: true })`);
  await sleep(300); const f1 = await page.eval(offset); await sleep(1000); const f2 = await page.eval(offset);
  check(Math.abs(f2 - f1) < 0.5, 'row pauses while a card has keyboard focus');
  await page.eval(`document.activeElement.blur()`);
  check(await page.eval(`document.documentElement.scrollWidth <= innerWidth`), '1440px has no horizontal page scroll');
  await page.screenshot(`${SHOTS}home-research-1440.png`);

  // A card opens its field on the Research page.
  const target = api.categories[3];
  await page.eval(`${SECTION}.querySelector('a[href="/research#${target.slug}"]').click()`);
  await page.waitFor(`location.pathname === '/research' && location.hash === '#${target.slug}'`);
  await sleep(1500);
  const top = await page.eval(`document.getElementById('${target.slug}').getBoundingClientRect().top`);
  check(top >= 60 && top < 220, `card opens /research#${target.slug} at that field (top ${Math.round(top)}px)`);

  // Reduced motion: no movement, single list, scrollable by hand.
  await open(1440, 900, false, true);
  check(await page.eval(`getComputedStyle(${TRACK}).animationName === 'none'`), 'reduced motion: no animation');
  check(await page.eval(`getComputedStyle(${SECTION}.querySelector('ul[aria-hidden="true"]')).display === 'none'`), 'reduced motion: duplicate list hidden');
  check(await page.eval(`(() => { const s = ${SECTION}.querySelector('.research-marquee'); return getComputedStyle(s).overflowX === 'auto' && s.scrollWidth > s.clientWidth; })()`), 'reduced motion: row scrolls sideways by hand');

  // Tablet and phones.
  for (const [w, h, moving] of [[768, 1024, true], [390, 844, false], [360, 780, false]]) {
    await open(w, h, true);
    const anim = await page.eval(`getComputedStyle(${TRACK}).animationName`);
    check(moving ? anim !== 'none' : anim === 'none', `${w}px ${moving ? 'glides' : 'does not auto-move'}`);
    if (!moving) {
      check(await page.eval(`(() => { const s = ${SECTION}.querySelector('.research-marquee'); return getComputedStyle(s).overflowX === 'auto' && getComputedStyle(s).scrollSnapType.includes('x') && s.scrollWidth > s.clientWidth; })()`), `${w}px is a swipe row with snap`);
    }
    check(await page.eval(`document.documentElement.scrollWidth <= innerWidth`), `${w}px has no horizontal page scroll`);
    await page.screenshot(`${SHOTS}home-research-${w}.png`);
  }
} finally {
  await page.close();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll homepage research-card checks passed');
process.exit(failures ? 1 : 0);
