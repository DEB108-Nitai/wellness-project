// Accessibility and responsive pass over every public page (Phase 6).
// For each page and width: axe-core WCAG 2.1 A/AA rules, sideways scroll, and tap targets under 44 px
// on phone and tablet widths. Full-page screenshots go to tests/e2e/shots/a11y/.
// Usage (XAMPP + `npm run dev` running): node tests/e2e/a11y.mjs [path ...]
// Read-only: it opens pages and creates no database rows (the visit counter skips automated browsers).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { launch } from './cdp.mjs';

const BASE = process.env.E2E_BASE ?? 'http://localhost:3000';
const OUT = new URL('./shots/a11y/', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
mkdirSync(OUT, { recursive: true });
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PAGES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['/', '/research', '/consultancy', '/team', '/contact', '/test', '/how-it-works', '/factors', '/factors/A', '/benefits',
     '/faq', '/privacy', '/terms', '/login', '/signup', '/forgot-password', '/no-such-page'];
const WIDTHS = process.env.WIDTHS ? process.env.WIDTHS.split(',').map(Number) : [360, 390, 768, 1440];

// Small controls on phones and tablets. Links inside running text are exempt (WCAG 2.5.8 "inline" exception),
// as are visually hidden inputs whose visible label is the target.
const SMALL_TARGETS = `(() => {
  const out = [];
  for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], summary')) {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (!r.width || !r.height || st.visibility === 'hidden' || el.closest('[aria-hidden=true]')) continue;
    if (r.width <= 2 && r.height <= 2) continue; // sr-only input; its label is the target
    if (el.tagName === 'A' && st.display === 'inline' && el.parentElement && /^(P|LI|SPAN|SMALL|LABEL|TD|DD)$/.test(el.parentElement.tagName)) continue;
    const label = el.closest('label');
    const box = label ? label.getBoundingClientRect() : r;
    if (box.width < 44 || box.height < 44) {
      const name = (el.getAttribute('aria-label') || el.innerText || el.value || el.name || el.id || el.tagName).trim().replace(/\\s+/g, ' ').slice(0, 40);
      out.push(el.tagName.toLowerCase() + ' "' + name + '" ' + Math.round(box.width) + 'x' + Math.round(box.height));
    }
  }
  return [...new Set(out)];
})()`;

// Stop early when the dev server is down: Chrome's own error page would otherwise be checked instead.
try {
  await fetch(BASE + '/');
} catch {
  console.error(`Nothing answers at ${BASE}. Start it with: npm run dev`);
  process.exit(2);
}

const report = [];
const page = await launch();
try {
  for (const path of PAGES) {
    for (const width of WIDTHS) {
      await page.viewport(width, 900, width < 1024);
      await page.goto(BASE + path);
      await page.waitFor(`document.querySelector('main, h1') && !document.querySelector('.animate-spin')`, 20000).catch(() => {});
      await sleep(700); // lazy page chunk, fonts, entry animations
      const overflow = await page.eval('document.documentElement.scrollWidth - window.innerWidth');
      const small = width < 1024 ? await page.eval(SMALL_TARGETS) : [];
      let violations = [];
      if (width === 390 || width === 1440) {
        if (!(await page.eval('!!window.axe'))) await page.eval(AXE);
        violations = await page.eval(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }).then(r =>
          r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 25).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\\n').slice(1, 2).join('')) , count: v.nodes.length })))`);
      }
      const slug = (path === '/' ? 'home' : path.slice(1).replace(/\//g, '-')) + '-' + width;
      await page.screenshot(`${OUT}${slug}.png`, true);
      report.push({ path, width, overflow, small, violations });
      const flag = overflow > 0 || small.length || violations.length ? '!!' : 'ok';
      console.log(`${flag} ${path} @${width}: overflow ${overflow}px, small targets ${small.length}, axe ${violations.map((v) => `${v.id}(${v.count})`).join(' ') || 'none'}`);
    }
  }
  writeFileSync(`${OUT}report.json`, JSON.stringify(report, null, 1));
  if (page.consoleErrors.length) console.log('console errors:', [...new Set(page.consoleErrors)].slice(0, 10));
  const bad = report.filter((r) => r.overflow > 0 || r.small.length || r.violations.length).length;
  console.log(bad ? `FAIL: ${bad} page/width combinations need attention (details in shots/a11y/report.json)` : 'PASS');
  process.exitCode = bad ? 1 : 0;
} finally {
  await page.close();
}
