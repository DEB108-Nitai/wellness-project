// E2E: a real respondent's answers, taken through the site, are scored with norm set v2 (stens read from the
// real distribution, migration 027) exactly as the independent Python reference says (docs/scoring/golden_v2.json).
// The chosen case is one whose stens differ from the old 2z + 5.5 formula, so the test shows the new method at work.
// Usage (XAMPP + `npm run dev`): node tests/e2e/scoring-v2.mjs [golden case name, default dataset-row-5]
// Creates one @example.com account and its test; delete them afterwards (see docs/PROGRESS.md).
import { readFileSync } from 'node:fs';
import { launch } from './cdp.mjs';
import { fileURLToPath } from 'node:url';

const BASE = 'http://localhost:3000';
const OUT = fileURLToPath(new URL('./shots/', import.meta.url));
const SCORING = new URL('../../docs/scoring/', import.meta.url);
const email = `e2e-v2-${Date.now()}@example.com`;
const step = (m) => console.log(`• ${m}`);

const caseName = process.argv[2] ?? 'dataset-row-5';
const v2 = JSON.parse(readFileSync(new URL('golden_v2.json', SCORING), 'utf8'));
const v1 = JSON.parse(readFileSync(new URL('golden.json', SCORING), 'utf8'));
const golden = v2.cases.find((c) => c.name === caseName) ?? (() => { throw new Error(`no golden case ${caseName}`); })();
const old = v1.cases.find((c) => c.name === caseName);
// Statement text -> answer, via the item key (the site shows the same wording as ipip16_items.tsv).
const answerByText = {};
for (const line of readFileSync(new URL('ipip16_items.tsv', SCORING), 'utf8').split(/\r?\n/).slice(1)) {
  if (!line) continue;
  const [code, , , text] = line.split('\t');
  answerByText[text.trim()] = golden.answers[code];
}

const page = await launch();
try {
  await page.viewport(1280, 900);
  await page.goto(`${BASE}/test`);
  await page.waitText('Before you begin');
  await page.eval(`document.querySelectorAll('input[type=checkbox]').forEach(c => c.click())`);
  await page.clickText('Continue', 'button');
  await page.waitText('A little about you');
  await page.fill('#country', 'IN');
  await page.fill('#age', '27');
  await page.fill('#gender', 'male');
  await page.fill('#nickname', 'Arjun');
  await page.fill('#education', 'bachelors');
  await page.fill('#occupation', 'Engineer');
  await page.clickText('Begin assessment', 'button');
  await page.waitText('Statement 1 of 166');

  const answers = JSON.stringify(answerByText);
  for (;;) {
    const missing = await page.eval(`(() => {
      const byText = ${answers};
      const words = { "Strongly Agree": 5, "Strongly Disagree": 1, "Agree": 4, "Disagree": 2, "Neutral": 3 };
      const unknown = [];
      document.querySelectorAll('fieldset').forEach((fs) => {
        const text = fs.querySelector('p').innerText.trim();
        const check = text.match(/select '([A-Za-z ]+)'/);
        const v = check ? words[check[1]] : byText[text];
        if (!v) { unknown.push(text); return; }
        fs.querySelectorAll('[role=radio]')[v - 1].click();
      });
      return unknown; })()`);
    if (missing.length) throw new Error(`no answer for: ${missing.join(' | ')}`);
    const last = await page.eval(`[...document.querySelectorAll('button')].some(b => b.innerText.includes('Review answers'))`);
    if (last) break;
    await page.clickText('Next page', 'button');
  }
  await page.clickText('Review answers', 'button');
  await page.waitText('Ready to see your profile?');
  await page.clickText('Submit and calculate my profile', 'button');
  await page.waitText('Your profile is ready', 20000);
  const ref = await page.eval(`document.body.innerText.match(/TE-[2-9A-HJ-NP-Z]{6}/)[0]`);
  step(`answered all 166 statements as golden case "${caseName}" and submitted ${ref}`);

  await page.clickText('Create free account', 'a');
  await page.waitText('Create your account');
  await page.fill('input[autocomplete=name]', 'Arjun Mehta');
  await page.fill('input[type=email]', email);
  await page.fill('input[autocomplete=new-password]', 'Calm-River-Lantern-42');
  await page.clickText('Create account', 'button');
  await page.waitText('Personality Report', 20000);

  const report = await page.eval(`fetch('/api/results/${ref}').then(r => r.json()).then(j => j.data)`);
  if (report.normVersion !== v2.norm_version) throw new Error(`scored with ${report.normVersion}, expected ${v2.norm_version}`);
  step(`report scored with ${report.normVersion}`);

  const rows = [];
  for (const f of report.factors) {
    const exp = golden.expected.factors[f.factorCode];
    const was = old?.expected.factors[f.factorCode].sten;
    if (f.sten !== exp.sten || f.band !== exp.band || f.rawScore !== exp.raw) {
      throw new Error(`${f.factorCode}: site sten ${f.sten}/${f.band}, Python reference ${exp.sten}/${exp.band}`);
    }
    rows.push(`${f.factorCode.padEnd(3)} ${f.factorName.padEnd(22)} raw ${String(f.rawScore).padStart(2)}  higher than ${String(f.percentile).padStart(4)}%  sten ${String(f.sten).padStart(2)} ${f.band.padEnd(7)}${was !== undefined && was !== f.sten ? `  (old formula: ${was})` : ''}`);
  }
  for (const d of report.domains) {
    if (d.sten !== golden.expected.domains[d.code].sten) throw new Error(`domain ${d.code}: site ${d.sten}, reference ${golden.expected.domains[d.code].sten}`);
  }
  console.log(rows.map((r) => '    ' + r).join('\n'));
  step('all 16 trait stens and bands and all 5 domain stens equal the Python reference');

  // Screenshot of the report's first traits for the owner.
  await page.waitText('5 Global Personality Domains');
  await page.screenshot(`${OUT}scoring-v2-report.png`, true);
  console.log(`\nRESULT: PASS (${email}, ${ref})`);
} catch (err) {
  console.error(`\nRESULT: FAIL — ${err.message}`);
  await page.screenshot(`${OUT}FAIL.png`).catch(() => {});
  process.exitCode = 1;
} finally {
  if (page.consoleErrors.length) console.log('Browser console errors:\n  ' + page.consoleErrors.join('\n  '));
  await page.close();
}
