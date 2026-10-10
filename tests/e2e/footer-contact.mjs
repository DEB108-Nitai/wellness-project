// Footer and Contact page (S9): company footer columns with real links, Our Ventures, support email, LinkedIn,
// new pages open at the top (also from footer links), Contact copy and email, team title, 4 widths.
// Read-only: creates no database rows. Usage (dev server running): node tests/e2e/footer-contact.mjs → shots/footer-*.png
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:3000';
const SHOTS = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}`);
  if (!ok) failures++;
};

const settings = (await (await fetch(`${BASE}/api/settings/public`)).json()).data;
const F = `document.querySelector('footer')`;
const columnLinks = (title) =>
  `[...${F}.querySelectorAll('h3')].find(h => h.innerText.trim().toLowerCase() === ${JSON.stringify(title.toLowerCase())})?.parentElement.querySelectorAll('li')`;

const page = await launch(9355);
const toBottom = async () => {
  await page.eval(`window.scrollTo(0, document.body.scrollHeight)`);
  await sleep(700);
};
try {
  await page.viewport(1440, 900);
  await page.goto(`${BASE}/`);
  await page.waitText('Our Ventures');
  await page.eval(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Got it')?.click()`);
  await page.waitFor(`${F}.innerText.includes('Institute of Life Semantics') && !!${F}.querySelector('a[href^="mailto:"]')`);

  const company = await page.eval(`[...${columnLinks('Company')}].map(li => [li.innerText, li.querySelector('a')?.getAttribute('href')])`);
  check(JSON.stringify(company) === JSON.stringify([['Research', '/research'], ['Consultancy', '/consultancy'], ['Our Team', '/team'], ['Contact', '/contact']]), 'Company column: Research, Consultancy, Our Team, Contact (real links)');
  const programs = await page.eval(`[...${columnLinks('Programs & 16PF')}].map(li => li.querySelector('a')?.getAttribute('href'))`);
  check(JSON.stringify(programs) === JSON.stringify(['/#60-days-challenge', '/test', '/how-it-works', '/factors', '/faq']), 'Programs & 16PF column links');
  const ventures = await page.eval(`[...${columnLinks('Our Ventures')}].map(li => [li.innerText, !!li.querySelector('a')])`);
  check(JSON.stringify(ventures) === JSON.stringify([['Evolve Institute', false], ['Institute of Life Semantics (ILS)', false], ['India Tribal Care', false]]), 'Our Ventures: three names, no links');
  check(await page.eval(`${F}.querySelector('a[href="mailto:${settings.support_email}"]')?.innerText.includes('${settings.support_email}')`), `support email ${settings.support_email} in the footer`);
  check(await page.eval(`(() => { const a = ${F}.querySelector('a[href="${settings.linkedin_url}"]'); return !!a && a.target === '_blank' && a.rel.includes('noopener'); })()`), `LinkedIn ${settings.linkedin_url} opens safely in a new tab`);
  check(await page.eval(`${F}.innerText.includes('Transenigma Pvt Ltd designs products and builds technology for social welfare')`), 'company blurb');
  check(await page.eval(`!!${F}.querySelector('a[href="/privacy"]') && !!${F}.querySelector('a[href="/terms"]') && ${F}.innerText.includes('Transenigma Pvt Ltd. All rights reserved.')`), 'legal row: Privacy, Terms, copyright');
  check(await page.eval(`!${F}.innerText.toLowerCase().includes('workshop') && !${F}.querySelector('svg.lucide-sparkles')`), 'no workshops, no sparkle icons');

  // New pages open at the top, also from links at the bottom of a long page.
  await toBottom();
  await page.eval(`${F}.querySelector('a[href="/research"]').click()`);
  await page.waitFor(`location.pathname === '/research' && document.querySelector('h1')?.innerText === 'Our research'`);
  await page.waitFor(`scrollY < 50`, 3000).catch(() => {});
  check((await page.eval(`scrollY`)) < 50, 'footer link opens the new page at the top');
  await page.goto(`${BASE}/`);
  await page.waitText('See all research');
  await page.eval(`document.querySelector('section[aria-labelledby="research-fields-title"]').scrollIntoView()`);
  await sleep(400);
  await page.eval(`[...document.querySelectorAll('a')].find(a => a.innerText.includes('See all research')).click()`);
  // The address changes first and React renders the new page a moment later, so wait for the page itself.
  await page.waitFor(`location.pathname === '/research' && document.querySelector('h1')?.innerText === 'Our research'`);
  await page.waitFor(`scrollY < 50`, 3000).catch(() => {});
  check((await page.eval(`scrollY`)) < 50, 'homepage "See all research" opens /research at the top');
  await toBottom();
  await page.eval(`${F}.querySelector('a[href="/#60-days-challenge"]').click()`);
  await page.waitFor(`location.pathname === '/' && location.hash === '#60-days-challenge'`);
  await sleep(1500);
  const top = await page.eval(`document.getElementById('60-days-challenge').getBoundingClientRect().top`);
  check(Math.abs(top) < 120, `footer "60-Day Programs" lands on the programs (top ${Math.round(top)}px)`);

  // Contact page.
  await page.goto(`${BASE}/contact`);
  await page.waitText('love to hear from you');
  await page.waitFor(`!!document.querySelector('main a[href^="mailto:"]')`, 8000).catch(() => {});
  check(await page.eval(`document.querySelectorAll('h1').length === 1 && document.querySelector('h1').innerText.trim() === 'We’d love to hear from you.'`), 'Contact h1: "We’d love to hear from you."');
  check(await page.eval(`document.body.innerText.includes('a consultancy project, the 16PF assessment or the 60-day programs? Write to us.')`), 'Contact sub-line');
  check(await page.eval(`!!document.querySelector('main a[href="mailto:${settings.support_email}"]')`), 'Contact page shows the support email');
  check(await page.eval(`!/Advisory Offices|psychometric team|Organizational Team Assessment/.test(document.querySelector('main').innerText + [...document.querySelectorAll('main input, main textarea')].map(e => e.placeholder).join(' '))`), 'old psychometrics-only copy is gone');
  check(await page.eval(`document.querySelector('main textarea').placeholder === 'How can we help?'`), 'message placeholder');

  // Team title.
  await page.goto(`${BASE}/team`);
  await page.waitText('Gulshan Chandrakar');
  check(await page.eval(`document.body.innerText.includes('CEO and Founder')`), 'Dr. Mayank Bhasin is "CEO and Founder"');

  for (const [w, h] of [[1440, 900], [768, 1024], [390, 844], [360, 780]]) {
    await page.viewport(w, h, w < 1440);
    await page.goto(`${BASE}/contact`);
    await page.waitText('Our Ventures');
    await toBottom();
    check(await page.eval(`document.documentElement.scrollWidth <= innerWidth`), `${w}px has no horizontal page scroll`);
    await page.eval(`${F}.scrollIntoView({ block: 'end' })`);
    await sleep(300);
    await page.screenshot(`${SHOTS}footer-${w}.png`);
  }
} finally {
  await page.close();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll footer and contact checks passed');
process.exit(failures ? 1 : 0);
