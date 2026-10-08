// Main navigation: dropdowns (hover, click, keyboard), program jumps, mobile drawer.
// Read-only: creates no database rows. Usage (dev server running): node tests/e2e/nav-flow.mjs
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:3000';
const SHOTS = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}`);
  if (!ok) failures++;
};

const page = await launch(9336);
const mouse = (type, x, y) => page.send('Input.dispatchMouseEvent', { type, x, y, button: 'none' });
const key = async (k, code = k) => {
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: { ArrowDown: 40, ArrowUp: 38, Escape: 27 }[k] });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code });
  await sleep(120);
};
const trigger = (label) => `[...document.querySelectorAll('header nav[aria-label=Main] [data-menu-trigger]')].find(b => b.innerText.includes(${JSON.stringify(label)}))`;
const centre = (expr) => page.eval(`(() => { const r = (${expr}).getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
const inView = (id) => page.eval(`(() => { const el = document.getElementById(${JSON.stringify(id)}); if (!el) return false; const t = el.getBoundingClientRect().top; return t >= 0 && t < 200; })()`);

try {
  // ---------------------------------------------------------------- desktop
  await page.viewport(1440, 900);
  await page.goto(`${BASE}/factors`);
  await page.waitText('16 Personality');
  await page.eval(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Got it')?.click()`);
  // The announcement bar appears once settings load and pushes the header down; let layout settle.
  await page.waitFor(`document.querySelector('header')?.getBoundingClientRect().top > 0`, 5000).catch(() => {});
  await sleep(500);

  const tabs = await page.eval(`[...document.querySelectorAll('header nav[aria-label=Main] > *')].map(e => e.innerText.trim())`);
  check(JSON.stringify(tabs) === JSON.stringify(['Home', 'Programs', '16PF Test', 'Contact']), `desktop tabs: ${tabs.join(' · ')}`);
  check(await page.eval(`!!document.querySelector('header')?.innerText.includes('Sign In')`), 'Sign In button still in the header');
  check(await page.eval(`${trigger('16PF Test')}.className.includes('border-teal-600')`), '16PF Test tab is active on /factors');

  // Hover opens, moving into the panel keeps it open, leaving closes it.
  await mouse('mouseMoved', 10, 600); // enter from elsewhere, like a real pointer
  const [px, py] = await centre(trigger('Programs'));
  await mouse('mouseMoved', px - 30, py);
  await mouse('mouseMoved', px, py);
  await sleep(250);
  check(await page.eval(`${trigger('Programs')}.getAttribute('aria-expanded') === 'true'`), 'hover opens Programs');
  await page.screenshot(`${SHOTS}nav-desktop-programs.png`);
  const [lx, ly] = await centre(`document.querySelector('#nav-menu-programs [data-menu-link]')`);
  await mouse('mouseMoved', px, py + 20);
  await mouse('mouseMoved', lx, ly);
  await sleep(300);
  check(await page.eval(`!!document.getElementById('nav-menu-programs')`), 'moving into the panel keeps it open');
  await mouse('mouseMoved', 1300, 600);
  await sleep(400);
  check(await page.eval(`!document.getElementById('nav-menu-programs')`), 'leaving closes it');

  // Program link from another page lands on the home page at that program.
  await page.eval(`${trigger('Programs')}.click()`);
  await sleep(200);
  await page.clickText('(PTI)', '#nav-menu-programs button');
  await page.waitFor(`location.pathname === '/' && location.hash === '#philosophical-intervention'`);
  await sleep(1500);
  check(await inView('philosophical-intervention'), 'Programs › PTI scrolls to the PTI block');

  // Filter to STI, then ask for TTI: the filter resets so TTI is found.
  await page.clickText('Sonic (STI)', '[id="60-days-challenge"] button');
  await sleep(300);
  check(await page.eval(`!document.getElementById('transcendental-intervention')`), 'STI filter hides TTI');
  await page.eval(`${trigger('Programs')}.click()`);
  await sleep(200);
  await page.clickText('(TTI)', '#nav-menu-programs button');
  await sleep(1500);
  check(await inView('transcendental-intervention'), 'Programs › TTI resets the filter and scrolls to TTI');

  // Same link twice still scrolls.
  await page.eval(`window.scrollTo(0, 0)`);
  await sleep(300);
  await page.eval(`${trigger('Programs')}.click()`);
  await sleep(200);
  await page.clickText('(TTI)', '#nav-menu-programs button');
  await sleep(1500);
  check(await inView('transcendental-intervention'), 'clicking the same program again scrolls again');

  // Keyboard: Down opens on the first link, Down moves, Esc closes and returns focus.
  await page.eval(`${trigger('16PF Test')}.focus()`);
  await key('ArrowDown');
  await sleep(150);
  check(await page.eval(`document.activeElement?.innerText.startsWith('Take the test')`), 'ArrowDown opens 16PF Test on its first link');
  await key('ArrowDown');
  check(await page.eval(`document.activeElement?.innerText.startsWith('How it works')`), 'ArrowDown moves to the next link');
  await page.screenshot(`${SHOTS}nav-desktop-16pf.png`);
  await key('Escape');
  check(
    await page.eval(`!document.getElementById('nav-menu-16pf') && document.activeElement === ${trigger('16PF Test')}`),
    'Esc closes and returns focus to the tab',
  );

  // Outside click closes; a routed child navigates.
  await page.eval(`${trigger('16PF Test')}.click()`);
  await sleep(150);
  await mouse('mousePressed', 700, 700);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 700, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 700, y: 700, button: 'left', clickCount: 1 });
  await sleep(200);
  check(await page.eval(`!document.getElementById('nav-menu-16pf')`), 'outside click closes the dropdown');
  await page.eval(`${trigger('16PF Test')}.click()`);
  await sleep(150);
  await page.clickText('How it works', '#nav-menu-16pf button');
  await page.waitFor(`location.pathname === '/how-it-works'`);
  check(true, '16PF Test › How it works opens /how-it-works');

  // ---------------------------------------------------------------- mobile
  await page.viewport(390, 844, true);
  await page.goto(`${BASE}/`);
  await page.waitText('16 Personality');
  await page.eval(`document.querySelector('button[aria-label="Toggle navigation menu"]').click()`);
  await sleep(300);
  await page.clickText('Programs', 'header button[aria-controls="mobile-nav-programs"]');
  await page.clickText('16PF Test', 'header button[aria-controls="mobile-nav-16pf"]');
  await sleep(200);
  check(await page.eval(`!!document.getElementById('mobile-nav-programs') && !!document.getElementById('mobile-nav-16pf')`), 'mobile groups expand');
  await page.screenshot(`${SHOTS}nav-mobile-drawer.png`);
  await page.clickText('(STI)', '#mobile-nav-programs button');
  await sleep(1500);
  check(await inView('sonic-therapy'), 'mobile Programs › STI scrolls to STI');
  check(await page.eval(`!document.getElementById('mobile-nav-programs')`), 'drawer closes after choosing a link');

  check(page.consoleErrors.length === 0, `no console errors${page.consoleErrors.length ? ': ' + page.consoleErrors.join(' | ') : ''}`);
} finally {
  await page.close();
}
console.log(failures ? `\n${failures} check(s) failed` : '\nAll navigation checks passed');
process.exit(failures ? 1 : 0);
