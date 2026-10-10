# Transenigma — Project Status & Handover

The single document to restart this project from scratch if all context is lost. **Update it at the end of every phase.**
Related: [PRD.md](PRD.md) (the agreed specification) · [DEVELOPMENT.md](DEVELOPMENT.md) (local setup and commands) · [`tests/e2e/README.md`](../tests/e2e/README.md) (browser tests)

_Last updated: 2026-10-10. **Phases 0–4 complete. Transenigma company-site slices S1–S10 complete** (§4b). Next: CodeRabbit review → DreamHost deploy (Phase 7) → auth completion (live SMTP/Google) → admin console (Phase 5)._

---

## 1. How to resume (read first)

1. **Working rules agreed with the owner**
   - Explain the plan and get explicit approval **before each phase**. Show results **at the end of each phase**.
   - **Never commit or push without the owner's OK.**
   - The PRD is the plan of record. Changes requested by the owner are added to it (with a version bump) and logged in §11.
   - Website text for the 60-Day programs must be approved by the owner before it goes live.
2. **Tech constraint:** the server runs **PHP + MySQL only** (DreamHost). Node.js is used only on a developer machine to build the React frontend into static files.
3. **Start the local environment** (Windows + XAMPP; Apache and MySQL must be running):
   ```
   C:\xampp\php\php.exe api\bin\migrate.php      # apply new migrations
   C:\xampp\php\php.exe api\tests\run.php        # API tests — all must pass (60 at last count)
   npm run lint                                  # TypeScript check
   npm run dev                                   # http://localhost:3000 (proxies /api to XAMPP)
   ```
4. **Git:** branch `feature/backend-foundation-auth`. Commits: `e128497` (Phases 1–2), `a1e342b` (Phase 3), then the Phase 4 commit ("feat: 60-day challenges STI/PTI/TTI…", see `git log`).
5. **Local databases:** `transenigma` (app) and `transenigma_test` (wiped by every test run). **Never touch** `wellness` / `wellness_test`; they belong to the separate older folder `htdocs/wellness-project`. The old `wellness16pf` / `wellness16pf_test` are a pre-rename backup (2026-10-09).
6. **Local admin account:** created by the owner with `api/bin/create-admin.php` (id 1). Test data from browser runs is always deleted afterwards.

---

## 2. What the product is

A website with two parts:

1. **16 Personality Factors assessment**
   - 166 statements: the 163 public-domain IPIP items plus 3 attention checks.
   - Scored against norms from 35,338 real respondents (Open Psychometrics data).
   - Guests can take the test, but must create a free account to see the report.
   - The report shows 16 factor stens (1–10) with percentiles and 5 global domains. It can be printed and shared through a link.
2. **Three free 60-Day Transformation Challenges**, shown on the home page in this order:
   - **STI:** Sonic Therapeutic Intervention (Hare Krishna mahamantra chanting).
   - **PTI:** Philosophical Therapeutic Intervention (study of Bhagavad Gita As It Is, Srimad Bhagavatam and Chaitanya Caritamrita).
   - **TTI:** Transcendental Therapeutic Intervention (chanting + scripture reading).
   - One registration form covers all three. On success it shows only "Registered successfully", and a confirmation email follows.

Roles: **user** and **admin** only. Audience: international, including the USA. Text on the site leads with practical benefits and keeps spiritual references light.

---

## 3. Architecture

```
Browser (React SPA, built by Vite)  ──fetch /api/* (same origin, cookies + CSRF token)──►  Apache  ──►  api/index.php (plain PHP 8.2)  ──PDO──►  MySQL / MariaDB
```

- **Frontend:** React 19, react-router 7, Tailwind 4 and lucide icons. `npm run build` outputs `dist/`, including `.htaccess` for real URLs, HTTPS, security headers and caching.
- **Backend:** plain PHP, no framework and no Composer. `api/index.php` is the only file reachable over HTTP; every other folder is denied by `.htaccess`.
- **Security:**
  - Sessions in HttpOnly cookies, and a CSRF token on every state-changing request.
  - Argon2id passwords and a blocklist of common passwords.
  - Rate limits stored in MySQL; IP addresses stored only as HMAC hashes.
  - An audit log of security-relevant actions.
  - Parameterised SQL everywhere, and server-side validation of every input.
- **Email:** PHPMailer (bundled in `api/lib/PHPMailer`). While `mail.host` is empty, emails are saved as HTML files in `api/storage/mail/` instead of being sent.
- **Scoring:** done only on the server. Verified against an independent Python reference (`docs/scoring/reference_scoring.py`, golden cases in `docs/scoring/golden.json`).

### Key files
| Area | Files |
|---|---|
| API entry and routes | `api/index.php`, `api/routes.php`, `api/bootstrap.php` |
| PHP core | `api/src/Core/`: Config, Database, Router, Kernel (guards: maintenance → CSRF → auth), Request, Response, Validator, Session, Csrf, Cookies, RateLimiter, Logger, SqlSplitter |
| Services | `api/src/Services/`: Auth, Token, GoogleOAuth, PasswordPolicy, Mailer, Audit, Settings, Assessment, Scoring, Quality, Results, Challenge, Site (contact/newsletter/FAQ), SpamGuard |
| Controllers | `api/src/Controllers/`: Health, Settings, Auth, GoogleAuth, Account, Assessment, Results, Challenge, Site, Admin |
| Email templates | `api/templates/email/*.php` (verify, reset, password changed, challenge registered, contact notification, newsletter welcome) |
| CLI | `api/bin/migrate.php`, `create-admin.php`, `cron-daily.php` |
| Database | `database/migrations/001…005_*.sql`. `002` is generated by `database/tools/build-seeds.php` from `docs/scoring/` |
| Frontend API layer | `src/api/` (client with CSRF handling, auth, assessment, challenge, site, admin) |
| Frontend state | `src/context/` (AuthContext, ActiveSessionContext, SettingsContext), `src/hooks/useAutosave.ts` |
| Pages | `src/pages/` (auth/*, test/AssessmentPage, results/*, AccountPage, UnsubscribePage, NotFoundPage) and `src/components/views/*` (landing, content pages, admin shell) |
| 60-Day section | `src/components/views/ChallengeSection.tsx` (section header, tabs, TTI block), `src/components/challenge/` (StiProgram, PtiProgram, ProgramPhoto, RegistrationModal) |
| Admin (Phase 4 subset) | `src/components/views/AdminPortalView.tsx`, `src/components/admin/RegistrationsPanel.tsx`, `SettingsPanel.tsx` |
| Tests | `api/tests/*Test.php` (plain-PHP runner `run.php`), `tests/e2e/*.mjs` (headless Chrome) |

### Implemented API endpoints
| Area | Endpoints |
|---|---|
| System | `GET /health`, `GET /settings/public` |
| Auth | `GET /auth/me`, `POST /auth/login`, `POST /auth/logout`, `POST /auth/signup`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `GET /auth/google/start`, `GET /auth/google/callback` |
| Account | `PATCH /account`, `POST /account/password` |
| Assessment | `GET /test/items`, `GET /test/session`, `POST /test/session`, `PUT /test/session/answers`, `POST /test/session/abandon`, `POST /test/session/submit`, `POST /test/session/review` |
| Results | `GET /results`, `GET /results/{ref}` (guests get 401 RESULTS_LOCKED), `POST/DELETE /results/{ref}/share`, `GET /shared/{token}` |
| Challenges and site | `POST /challenge/registrations`, `GET /challenge/my-registrations`, `POST /contact`, `POST /newsletter/subscribe`, `POST /newsletter/unsubscribe`, `GET /faqs` |
| Admin (Phase 4) | `GET /admin/registrations`, `PATCH /admin/registrations/{id}`, `GET /admin/export/registrations` (CSV), `GET/PUT /admin/settings` |

Maintenance mode: public endpoints return **503** while `auth/*`, `settings/public`, `health` and `admin/*` stay available, and admins bypass the block.

### Database (migrations)
| # | Contents |
|---|---|
| 001 | All tables: users, auth_tokens, rate_limits, factors, domains, domain_weights, item_sets, items, norm_sets, factor_norms, factor_percentiles, domain_norms, test_sessions, session_answers, session_page_times, session_factor_scores, session_domain_scores, session_reviews, challenge_registrations, contact_messages, newsletter_subscribers, faqs, settings, audit_logs, email_log |
| 002 | Reference data: 16 factors, 5 domains with ± weights, item set `ipip16-v1` (166 items), norm set `ipip16-op2019-v1` (means, SDs, percentile tables) |
| 003 | Default settings (min age 18, 7 items per page…) and 9 FAQs |
| 004 | `users.session_version` (sign out all devices on password change) |
| 005 | `challenge_registrations.program` gains `PTI` |
| 006 | FAQs updated for three programs; new FAQs "Can I join more than one program?" and "Do I need any background … to join PTI?" |
| 007 | Transenigma site name and FAQ wording |
| 008–010 | Company content tables (team, research categories + publications, consultancy groups + projects, ventures) and their seed from the old site |
| 011 | Result codes WL- → TE- |
| 012–015 | Publication fixes: missing year, 26 verified links, punctuation, full titles and journals |
| 016 | `research_categories.tagline` for the homepage cards |
| 017–018 | Depression Prediction Engine image: distressing old image removed, owner-supplied illustration |
| 019 | `support_email` support@transenigma.com; Dr. Mayank Bhasin "CEO and Founder" |
| 020 | `linkedin_url` setting (company LinkedIn page) |

---

## 4. Phase status

| Phase | Scope | Status |
|---|---|---|
| 0 | PRD | ✅ Approved; now v1.3 |
| 1 | Foundation: PHP core, schema, IPIP items + norms, `.htaccess`, cleanup | ✅ Committed `e128497` |
| 2 | Authentication: sign-up/in/out, verification, reset, Google OAuth, roles, admin CLI | ✅ Committed `e128497`. Live email and Google wait on credentials |
| 3 | Assessment and results: server sessions, scoring, guest flow, results gate, sharing, My Results | ✅ Committed `a1e342b` |
| 4 | 60-Day Challenges (STI, PTI, TTI), contact, newsletter, FAQ, settings, maintenance | ✅ Committed |
| 5 | Admin console on server data + anonymise user + admin 2FA | ⬜ Next |
| 6 | UI polish, SEO, accessibility, performance of the bundle | ⬜ |
| 7 | Production hardening and DreamHost deploy | ⬜ |

### What each phase delivered
- **Phase 1: foundation.** PHP core and migrations 001–003. Real IPIP items and norms derived from 35,338 respondents. Locked-down `.htaccess` files. Removed: researcher portal, campaigns, deletion requests, the standalone Sonic page, demo data and unused Node packages.
- **Phase 2: authentication.**
  - Argon2id passwords; lockout after 5 failures per email+IP for 15 minutes.
  - Single-use, hashed tokens for verification and reset links. Password reset or change signs out other devices.
  - Google OAuth (server-side, state + PKCE).
  - Admin idle timeout of 12 hours; the `create-admin` CLI.
  - React: real URLs, AuthContext, onboarding-style auth pages, account page, route guards.
- **Phase 3: assessment and results.**
  - Scoring engine (golden-tested) and quality flags (attention checks, straight-lining, speed).
  - Sessions owned by a guest cookie or an account; guest tests are attached to the account at sign-in.
  - Autosave with offline queue and real page timing. Resume opens the first unanswered page.
  - Results are locked for guests, owner/admin only (others get 404), with revocable share links that hide age and country, and a My Results page.
- **Phase 4: challenges and site.**
  - Three programs in the order STI → PTI → TTI. PTI section uses the approved copy.
  - Photo slots in each program's left panel, beside the text (empty until the owner sends photos; see §7).
  - One registration modal for all three programs, using the API, with consent and anti-spam (honeypot + minimum fill time).
  - Success message is only "Registered successfully". Confirmation email sent. Same-program duplicates blocked; joining other programs allowed. Status starts as `registered`.
  - Contact form, newsletter (subscribe, plus an unsubscribe page that asks for confirmation) and FAQs now come from the database.
  - Site settings come from the server. Maintenance mode is enforced by the server.
  - Account page lists the user's challenge registrations.
  - Admin: server-backed Registrations tab (program and status filters, search, detail view, status and notes, CSV export) and Settings tab. Other tabs show "Phase 5" notices.
  - The browser-storage layer (`storageService.ts`, `initialData.ts`) is deleted; the site has no client-side data store left.

## 4b. Transenigma company site (owner decision 2026-10-08)

The product became the company website of Transenigma Pvt Ltd, replacing transenigma.com. It was built in owner-approved slices on top of Phases 0–4. The plan is in `~/.claude/plans/unified-mapping-moore.md`.

| Slice | Scope | Commit |
|---|---|---|
| S1–S2 | Name, SVG logo and icon, teal logo | `4aab61e`, `76830db` |
| S3 | Navigation: Programs ▾ and 16PF Test ▾ dropdowns, mobile drawer | `2320168` |
| S4 | Homepage: dark intro, "Three disciplines" cards, 16PF content, programs; no sparkle icons; workshops dropped | `44af262` |
| S5 | Content tables + API (`/api/content/{team,research,consultancy,ventures}`), migrations 008–010 | `41c11ec` |
| S6 | Our Team `/team` | `cbee41c` |
| S7 | Research `/research`: 15 fields, 97 publications, search, deep links, scroll-spy | `50ba1ea` |
| — | Code rename Wellness → Transenigma (namespace, DBs, `te_` cookies, `TE-` codes, migration 011) | `8a216c4` |
| — | Publication data: year, 26 verified links (Crossref/DOI), full titles (012–015) | `a2791a2` |
| S7b | Homepage research field cards (CSS marquee, taglines, migration 016) | `29ac677` |
| S8 | Consultancy `/consultancy` (017–018: distressing old image replaced) | `d03f10c` |
| S9 | Company footer, Contact copy, `linkedin_url` setting, scroll-to-top on page change (019–020) | `3fe4bcf` |
| S10 | 301 redirects from old URLs, per-page titles/descriptions/canonical/noindex, robots.txt, sitemap.xml | this slice |

**Old URLs → new** (in `public/.htaccess`; checked by `tests/e2e/redirects.mjs`):
- `/index` → `/`.
- `/portfolio`, `/services` and `/mvppoc` → `/consultancy`.
- `/enterprise` → `/consultancy#enterprise`; `/webmobile` → `#web-mobile`; `/iot` → `#iot`.
- `research.php`, `consultancy.php`, `contact.php` and `team.php` → their new pages; `/about` → `/team`.
- `/workshop/…` → `/`.

**Waiting on the owner (company):**
- registered office address, CIN and phone number for the footer and Contact page (ask after every phase);
- final OK of the teal logo.

---

## 5. Prototype faults (from the first analysis)

| # | Fault | Status |
|---|---|---|
| 1 | Passwords never checked | ✅ P2 |
| 2 | Anyone could become admin; any admin login accepted | ✅ P2 |
| 3 | Fake Google login | ✅ P2 (needs Client ID to go live) |
| 4 | Results page could show another person's results | ✅ P2/P3 |
| 5 | Sign-up with an existing email signed into that account | ✅ P2 |
| 6 | Forgot password did nothing | ✅ P2 (real sending needs SMTP) |
| 7 | Global domains ignored factor signs | ✅ P3 |
| 8 | Submit allowed with 10/163 answers | ✅ P3 |
| 9 | Invented norms / AI-written items | ✅ P1/P3 |
| 10 | Admin items-per-page / min-age ignored | ✅ P3 server + P4 admin Settings tab |
| 11 | Campaign links not validated | ✅ Removed (P1) |
| 12 | Resume only for signed-in users | ✅ P3 |
| 13 | "Start fresh" deleted data; page time hard-coded | ✅ P3 |
| 14 | Terms link left consent; footer Terms opened Privacy | ✅ P2/P3 |
| 15 | STI registrations invisible to admin | ✅ P4 |
| 16 | Wrong program details saved | ✅ P4 |
| 17 | Auto-"confirmed", duplicates, no email | ✅ P4 |
| 18 | Data with no admin UI | 🟡 Registrations + settings done (P4); participants, users, messages, FAQs, audit in **P5** |
| 19 | Newsletter not saved; maintenance only local | ✅ P4 |
| 20 | Auth changes didn't refresh the UI | ✅ P2 |
| 21 | No real URLs | ✅ P2 |
| 22 | Demo data mixed with real data | ✅ P1 |
| 23 | Wrong labels/thresholds | ✅ P3 (admin item-key view returns in P5) |

---

## 6. Pending work

### Phase 5 — Admin console (next)
- [ ] Dashboard: tests started and completed, completion rate, flagged sessions, new users, new messages, recent audit events.
- [ ] Participants: search and filters, detail view (demographics, timing, quality, 16 + 5 scores, item answers). Streamed CSV including optional item answers.
- [ ] Users: list and search, view, change role, disable/enable (admins can't demote or disable themselves).
- [ ] Contact messages: list, mark handled. Newsletter subscribers: list and export.
- [ ] FAQs: create, edit, delete, reorder, publish.
- [ ] Question set and norms: read-only view. Audit log: filters.
- [ ] **ADM-11 Anonymise user:** for erasure requests; removes personal data, keeps answers.
- [ ] **ADM-12 Admin two-factor sign-in:** authenticator app (TOTP) plus recovery codes.

### Phase 6 — UI polish
- [ ] Consistency pass with shared components. Per-page titles and descriptions. Accessibility (WCAG 2.1 AA) and mobile pass.
- [ ] Hide "Take Test" in the navbar while inside the test.
- Note: the test timer (restored 2026-10-05) shows active time and continues from the saved total after resume (`SessionState.activeSeconds`).
- [ ] Lazy-load the admin bundle (main JS is about 500 KB raw / 140 KB gzip).
- [ ] *Suggestion, not yet approved:* personalised growth recommendations based on actual scores.

### Phase 7 — Production and deploy (DreamHost)
- [ ] Production `config.php` outside the web root; MySQL database; run `migrate.php` and `create-admin.php`.
- [ ] Cron jobs: `api/bin/cron-daily.php` daily, plus a daily `mysqldump` with 14-day rotation.
- [ ] HTTPS; optional Cloudflare (`app.trust_cloudflare`); Google OAuth production redirect URI; SMTP; SPF/DKIM.
- [ ] Lighthouse and security-header checks; `docs/DEPLOY.md`; PRD Appendix C acceptance run on the live site.

---

## 7. Program photos
- **Done (2026-10-05).** The owner supplied the photos, which are stored as WebP in `public/images/programs/`:
  - `sti.webp`: a hand with wooden japa beads beside a tulsi plant.
  - `pti.webp`: a person meditating at sunset (resized from a 12 MB PNG to 66 KB).
  - `tti.webp`: a young woman scrolling her phone in bed at night (fits "Trapped in the Loop?").
- Configured in `src/components/challenge/ProgramPhoto.tsx` (the `PHOTOS` map, including a `focus` focal point so cropping keeps the subject visible).
- **To replace a photo:** keep it landscape, at most 1600 px wide, WebP or JPEG, ideally under 300 KB, then overwrite the file. If the subject moves, adjust `focus`.
- Make sure the site has the right to use each photo. Stock images usually need a licence.

## 8. Waiting on the owner / their senior

| Item | Needed for | Status |
|---|---|---|
| Domain name | Email links, Google redirect, deploy | Asked senior (message drafted 2026-10-05) |
| Support email + sending mailbox | Contact notifications, confirmation emails | Asked senior |
| SMTP credentials | Real email sending | Asked senior. Enter directly into `config.local.php`, never in chat |
| Google OAuth Client ID/secret | Google sign-in | Owner will create |
| Production MySQL + SFTP/SSH | Phase 7 | Later |

**Cleaning browser-test data** (the e2e scripts create real local records): delete users, challenge registrations, contact messages and newsletter rows with `@example.com` addresses, plus their `audit_logs` / `email_log` rows. Keep the owner's admin (id 1).

---

## 9. Approved website content (do not change without approval)
- **STI and TTI:** keep the original wording exactly as it is (owner, 2026-10-05); STI may mention the Hare Krishna mahamantra. Their layout was changed (owner request): all three programs share TTI's design (header → introduction card with a slate photo panel on the left → "Four Pillars" row). STI's four benefit boxes became its pillars; its title gained "(STI)".
- **Numbering (owner, 2026-10-05):** STI = Program 01, PTI = Program 02, TTI = Program 03.
- **PTI** (approved 2026-10-05, in `PtiProgram.tsx`):
  - Badge: "Program 02 · 60 Days Challenge". Audience badge: "Open to Everyone · No Experience Needed" (replaced "Built for Students & Young Professionals").
  - Tagline: "Fix the thought. The habit fixes itself."
  - Book names, listed by name only: Bhagavad Gita As It Is · Srimad Bhagavatam · Chaitanya Caritamrita.
  - Headline: "Your Mind Runs on Old Code. Time for an Upgrade."
  - Intro: "Your habits run on your beliefs…".
  - Three question cards, a "What We Study Together" block (names the Bhagavad Gita As It Is, Srimad Bhagavatam, Chaitanya Caritamrita and other Vedic scriptures; added on owner request, awaiting the owner's final look), the "Why it works" strip, the "Four Pillars of Philosophical Transformation" row (from the four benefit boxes), the format line, and the button "Start the PTI Challenge (Free)".
- **Registration success:** the text "Registered successfully" only.
- **Not on the site, by owner decision:** program format (online/in-person) is sent by email after registration; no time commitment is stated; no organisation is named; no extra program-specific questions in the form.

---

## 10. Testing
- **API:** `C:\xampp\php\php.exe api\tests\run.php` gives **60 passing tests**. They cover core, database and seeds, auth, scoring (golden), assessment lifecycle and privacy, challenges, contact, newsletter, settings and spam guard. They use the `transenigma_test` database, which is wiped on every run.
- **Browser:** `tests/e2e/guest-flow.mjs` and `tests/e2e/phase4-flow.mjs`. Both passed at the end of their phases. `tests/e2e/challenge-shots.mjs` captures the three program blocks at desktop and phone widths for a visual check.
- **Frontend:** `npm run lint` (TypeScript) and `npm run build`.

---

## 11. Decisions log

| Date | Decision |
|---|---|
| 2026-10-03 | Backend is plain PHP 8.2 + MySQL only; Node only builds the frontend. |
| 2026-10-03 | Two roles (user, admin). No researcher portal, campaigns or deletion requests; data kept for research. |
| 2026-10-03 | Hosting on DreamHost, one domain for the site and `/api`; plain PHP without Composer. |
| 2026-10-03 | Guests may take the test; results require an account. Demo data removed. |
| 2026-10-03 | Real IPIP items + 3 attention checks; norms from Open Psychometrics (credited). |
| 2026-10-03 | Email verification doesn't block access. Minimum age 18. Erasure requests handled by anonymisation. Admin 2FA approved. |
| 2026-10-05 | Non-owners viewing a report get 404 (not 403). |
| 2026-10-05 | A third program, PTI, is added and shown between STI and TTI. STI/TTI copy unchanged. "Registered successfully" is the only success text. Multiple programs per person allowed. |
| 2026-10-05 | Website text: benefits-first and light on spiritual detail (international/US audience); the mahamantra may be named in STI. |
| 2026-10-05 | Photos supplied by the owner later; empty slots until then. |
| 2026-10-05 | All three programs share TTI's layout in calm colours (STI teal, PTI indigo/lavender, TTI amber), with slate photo panels; numbering STI 01, PTI 02, TTI 03. |

---

## 12. Known limitations / notes
- Changing "items per page" while people are mid-test changes the page numbers they see. Answers are never lost, and resume opens the first unanswered page.
- The admin tabs Participants, Question Set and Audit Log show "Phase 5" notices by design.
- `app.url` in the config must be the public site URL. Email links and the Google redirect are built from it.
- Headless Chrome with the CLI `--screenshot` flag can't go below 512 px wide. The e2e driver uses the DevTools protocol for true mobile sizes.
- Python in this repo (`docs/scoring/*.py`) is a developer tool only. It is never deployed.
