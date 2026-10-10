// Consultancy page (/consultancy, S8): header, client names, three service areas + upcoming products from the API,
// only working links get "Visit site", anchors for the old site's redirects, nav tab, homepage link, 4 widths.
// Read-only: creates no database rows. Usage (dev server running): node tests/e2e/consultancy-page.mjs → shots/consultancy-*.png
import { launch } from './cdp.mjs';

const BASE = 'http://localhost:3000';
const SHOTS = new URL('./shots/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? '  ✓' : '  ✗'} ${label}`);
  if (!ok) failures++;
};

const api = (await (await fetch(`${BASE}/api/content/consultancy`)).json()).data;
const projects = api.groups.flatMap((g) => g.projects);
const withUrl = projects.filter((p) => p.url);

const page = await launch(9345);
try {
  for (const [w, h, mobile, cols] of [[1440, 900, false, 3], [768, 1024, true, 2], [390, 844, true, 1], [360, 780, true, 1]]) {
    await page.viewport(w, h, mobile);
    await page.goto(`${BASE}/consultancy`);
    await page.waitText('Depression Prediction Engine');
    await page.eval(`[...document.querySelectorAll('button')].find(b => b.innerText.trim() === 'Got it')?.click()`);
    await page.eval(`window.scrollTo(0, document.body.scrollHeight)`);
    await page.waitFor(`[...document.querySelectorAll('main img, section img')].every(i => i.complete && i.naturalWidth > 0)`, 8000).catch(() => {});
    await page.eval(`window.scrollTo(0, 0)`);
    await sleep(400);

    if (w === 1440) {
      check(await page.eval(`document.querySelectorAll('h1').length === 1 && document.querySelector('h1').innerText === 'We build what matters.'`), 'one h1: "We build what matters."');
      check(await page.eval(`document.body.innerText.includes('9 client projects · 3 service areas · 2 upcoming products')`), 'facts line: 9 client projects · 3 service areas · 2 upcoming products');
      check(await page.eval(`document.querySelectorAll('section[aria-labelledby="clients-title"] li').length === 9`), '9 client names');
      const order = await page.eval(`[...document.querySelectorAll('section[id] h2')].map(e => e.innerText)`);
      check(JSON.stringify(order) === JSON.stringify(api.groups.map((g) => g.name)), 'service areas then Upcoming Products, in API order');
      for (const g of api.groups) {
        const names = await page.eval(`[...document.querySelectorAll('#${g.slug} h3')].map(e => e.innerText)`);
        check(JSON.stringify(names) === JSON.stringify(g.projects.map((p) => p.name)), `#${g.slug}: ${names.length} ${g.slug === 'upcoming' ? 'products' : 'projects'}`);
      }
      const links = await page.eval(`[...document.querySelectorAll('a')].filter(a => a.innerText.includes('Visit site')).map(a => [a.href, a.target, a.rel])`);
      check(links.length === withUrl.length && withUrl.every((p) => links.some((l) => l[0] === p.url)), `"Visit site" only for the ${withUrl.length} working links`);
      check(links.every((l) => l[1] === '_blank' && l[2].includes('noopener')), 'site links open safely in a new tab');
      check(await page.eval(`[...document.querySelectorAll('#upcoming article')].every(a => a.innerText.includes('In development'))`), 'upcoming products are marked "In development"');
      check(await page.eval(`[...document.querySelectorAll('section img')].every(i => i.complete && i.naturalWidth > 0)`), 'all project images load');
      check(await page.eval(`!document.body.innerText.match(/Tour Mayapur|Aiwa|Pongworks/)`), 'dead-link projects are not shown');
      check(await page.eval(`[...document.querySelectorAll('header nav[aria-label=Main] button')].find(b => b.innerText.trim() === 'Consultancy')?.className.includes('border-teal-600')`), 'Consultancy tab is active');
      check(await page.eval(`!document.querySelector('svg.lucide-sparkles')`), 'no sparkle icons');
    }
    const perRow = await page.eval(`(() => { const t = [...document.querySelectorAll('#web-mobile > ul > li')].map(li => Math.round(li.getBoundingClientRect().top)); return t.filter(x => x === t[0]).length; })()`);
    check(perRow === cols, `${w}px shows ${cols} per row (got ${perRow})`);
    check(await page.eval(`document.documentElement.scrollWidth <= innerWidth`), `${w}px has no horizontal page scroll`);
    await page.screenshot(`${SHOTS}consultancy-${w}.png`);
  }

  // Anchors for the old site's redirects land on their area.
  await page.viewport(1440, 900);
  for (const slug of ['iot', 'web-mobile']) {
    await page.goto(`${BASE}/consultancy#${slug}`);
    await page.waitText('Depression Prediction Engine');
    await sleep(800);
    const top = await page.eval(`document.getElementById('${slug}').getBoundingClientRect().top`);
    check(top >= 60 && top < 200, `/consultancy#${slug} lands on that area (top ${Math.round(top)}px)`);
  }

  // Contact button and the homepage link.
  await page.clickText('Contact us', 'button');
  await page.waitFor(`location.pathname === '/contact'`);
  check(true, '"Contact us" opens /contact');
  await page.goto(`${BASE}/`);
  await page.waitText('See our work');
  await page.clickText('See our work', 'button');
  await page.waitFor(`location.pathname === '/consultancy'`);
  check(true, 'homepage "See our work" opens /consultancy');
} finally {
  await page.close();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll consultancy-page checks passed');
process.exit(failures ? 1 : 0);
