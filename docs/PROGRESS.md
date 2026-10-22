# Transenigma — Project Status & Handover

The single document to restart this project from scratch if all context is lost. **Update it at the end of every phase.**
Related: [PRD.md](PRD.md) (the agreed specification) · [DEVELOPMENT.md](DEVELOPMENT.md) (local setup and commands) · [`tests/e2e/README.md`](../tests/e2e/README.md) (browser tests)

_Last updated: 2026-10-22. **The site is live at https://transenigma.com since 2026-10-19** (Phase 7, §4g). Phases 0–7 complete; post-launch work (newsletter, animated heading, replies with subject…) merged as PR #9 and deployed 2026-10-22. Handover for the company: [HANDOVER.md](HANDOVER.md)._

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
   C:\xampp\php\php.exe api\tests\run.php        # API tests — all must pass (163 at last count, 2026-10-22)
   npm run lint                                  # TypeScript check
   npm run dev                                   # http://localhost:3000 (proxies /api to XAMPP)
   ```
4. **Git:** all work reaches `main` through pull requests (#1–#9 merged). The live site runs `main` at `2c46916` (deployed 2026-10-22). Branch `fix/review-followups` holds the last review fixes for PR #9 and this documentation update (not merged yet). Deploying: [DEPLOY.md §8](DEPLOY.md), scripts in [`deploy/`](../deploy/).
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
| 021 | `company_address` and `company_cin` settings (registered office + CIN, shown in footer and Contact) |
| 022 | Admin-managed research papers and consultancy projects (`publications.created_at`, image paths) |
| 023 | Private visit counter (`page_views`, `daily_visits`; no cookie, IP or user agent stored) |
| 024 | Admin two-step sign-in (encrypted TOTP secret, hashed recovery codes) |
| 025 | Consultancy categories managed by admins |
| 026 | Primary admin (`users.is_primary_admin`, unique `primary_lock`) |
| 027 | Norm set `ipip16-op2019-v2`: stens from the real distribution (`factor_stens`), generated |
| 028 | `contact_message_replies`: replies sent from the admin console |
| 029 | `contact_message_replies.subject` (the admin writes the reply's subject) |
| 030 | `newsletters` and `newsletter_deliveries` (newsletter composer and send queue) |

---

## 4. Phase status

| Phase | Scope | Status |
|---|---|---|
| 0 | PRD | ✅ Approved; now v1.3 |
| 1 | Foundation: PHP core, schema, IPIP items + norms, `.htaccess`, cleanup | ✅ Committed `e128497` |
| 2 | Authentication: sign-up/in/out, verification, reset, Google OAuth, roles, admin CLI | ✅ Committed `e128497`. Live email and Google sign-in done in auth completion (§4c) |
| 3 | Assessment and results: server sessions, scoring, guest flow, results gate, sharing, My Results | ✅ Committed `a1e342b` |
| 4 | 60-Day Challenges (STI, PTI, TTI), contact, newsletter, FAQ, settings, maintenance | ✅ Committed |
| 5 | Admin console on server data + anonymise user + admin 2FA | ✅ Done 2026-10-13 (branch `feature/admin-console`) |
| 6 | UI polish, SEO, accessibility, performance of the bundle | ✅ Merged and live |
| 7 | Production hardening and DreamHost deploy | ✅ Live 2026-10-19 (§4g) |

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

**Company details:** registered office address and CIN were supplied on 2026-10-11 and are shown in the footer and on the Contact page (settings `company_address`, `company_cin`, editable in admin Settings). **No phone number is published** (owner decision).

**Waiting on the owner (company):** final OK of the teal logo.

## 4c. Auth completion (branch `feature/auth-completion`, 2026-10-10 → 11)

| Step | What | Commit |
|---|---|---|
| A | Session cookie renewed on activity (at most daily); daily cron deletes old session files | `4817c4b` |
| B | Real email via DreamHost SMTP; brand icon embedded; dark-mode-safe buttons | `fe858a4` |
| — | Sign-in pages redesigned to match the site; verify page says "Sign in to continue" | `4d9d4d2` |
| — | Reserved test domains (`@example.com` …) never sent over SMTP | `9221ed9` |
| C | Google sign-in live and tested (link to existing account, returning sign-in, cancel, forged state); test for disabled accounts via Google; project skill `.claude/skills/build-auth` | this step |
| — | Registered office address + CIN in footer and Contact (migration 021) | this step |

**Note:** the owner's account (id 1) was demoted to `user` for testing (owner request, 2026-10-11) and is linked to Google. Re-promote with `create-admin.php` when the admin console is ready.

## 4d. Test and form edge cases (branch `fix/test-edge-cases`, 2026-10-11)

Found after the owner finished the test as a guest, clicked "I already have an account", then "Back to home": the result was saved but nothing on the site pointed back to it.

| # | Case | Fix |
|---|---|---|
| 1 | Guest leaves the results gate | `GET /test/result-pending`; /test shows "Your profile is ready", and the navbar CTA reads "See my result" |
| 2 | Guest signs in later without the `next` link | Sign-in returns `claimedResultRef` once; email, sign-up and Google open `/results/<ref>` when no destination was chosen |
| 3 | Signed out mid-test | Autosave stops on `NO_ACTIVE_SESSION` and shows "You have been signed out"; answers stay in localStorage |
| 4 | Submitted or restarted in another tab | Autosave sends the test `ref`. The server refuses a closed test with `SESSION_CLOSED {status}`, and **never writes an old tab's answers into a newer test** (a real bug found while fixing this) |
| 5 | Device clock running fast | SpamGuard uses browser-measured `formElapsedMs`; before, every form failed with "That was quick!" |
| 6 | Account draft vs guest draft at sign-in | Keep the one with more answers (the most recent on a tie) |
| 7 | Back button inside the test | The page lives in the URL (`/test?page=N`, `?page=review`); Back steps through pages |
| 8 | 60-day form closed by accident | Asks "Discard your registration?" when something was typed |

**Tests:**
- API: 77 passing (5 new).
- New E2E `tests/e2e/edge-cases.mjs`.

## 4e. CodeRabbit deep-scan fixes (branch `fix/auth-scan`, 2026-10-12)

The owner ran a CodeRabbit deep scan and pasted 12 findings (1 duplicate). All 11 were checked against the code and were real or partly real.

| # | Finding | Fix |
|---|---|---|
| F1 | A login rehash could write the old password over a reset that landed meanwhile | `rehashPassword($id, $oldHash, $newHash)` only replaces the hash it checked; otherwise sign-in fails |
| F2 | A password change in flight could overwrite a reset and keep its session on the new version | `updatePassword(..., $expectedVersion)` writes only if `session_version` is unchanged; otherwise 401 and signed out. The session takes the version its own write created |
| F3 | Google linked any `email_verified` address, and could replace an existing link | Link by email only when Google hosts the address (Gmail, or `hd` = the email's domain). Never replace a `google_sub` (`GOOGLE_ACCOUNT_MISMATCH`). Other addresses get `GOOGLE_LINK_REQUIRES_PASSWORD`; new accounts on them start unverified and get a verification email |
| F4 | Local mail previews put raw user text in an HTML comment | Header escaped |
| F5 | The E2E driver trusted whatever listened on a fixed debug port | Chrome picks a random port, read from `DevToolsActivePort` in its own temporary profile |
| F6 | `npm run dev` listened on the LAN, and Vite could serve `api/config/config.local.php` and saved reset emails via `/%61pi/...` or `/@fs/...` | `server.fs.deny` covers `api/`, `database/`, `notes/` and `tests/` (keeping Vite's defaults). `dev` binds to localhost; `npm run dev:lan` is for phone testing |
| F7 | A sign-up made with someone else's email got verified when the real owner clicked the link | Verification needs the signed-in account the link was sent for (`SIGN_IN_TO_VERIFY` / `WRONG_ACCOUNT`); a refused click keeps the link (`TokenService::peek`). A reset still lets the real owner take the account back |
| F8 | The 60-day form said "already registered for <program>" to anyone | Same "Registered successfully" either way; the inbox gets the `challenge-already-registered` email instead |
| F9 | The CSV export's backslash escape let `x\",=CMD()` become a new, unchecked cell | `fputcsv(..., escape: '')` (RFC 4180) |
| F10 | Unsent test answers stayed in localStorage after Sign out | Sign-out saves them to the account first, then clears every `te_pending_*` key; other tabs stop (`te_signout` storage event) |
| F11 | E2E screenshots, the journal and `.git` were reachable over the LAN (Vite and XAMPP Apache) | Vite deny list; a new repo-root `.htaccess` (local only, never deployed) allows only `api/` and `dist/` |

**Tests:**
- API: 83 passing (6 new).
- `edge-cases.mjs` gained a sign-out check; guest-flow and redirects pass. Browser check of the verify link: signed out → sign in → confirmed.
- Status checks: the bypass paths return 403 on Vite and Apache.

**Before launch:** use fresh production secrets (Google client secret, `app.secret`), since the dev server was reachable on the LAN.

---

## 4f. Phase 5 admin console — slice A: research and consultancy content (branch `feature/admin-console`, 2026-10-12)

Owner asks: research papers and consultancy projects managed from the admin, and every number on the site follows.

- **Admin console rebuilt** as its own lazy-loaded bundle (`src/components/admin/AdminApp.tsx`, ~58 KB) with a sidebar, a phone drawer and real URLs (`/admin`, `/admin/registrations`, `/admin/research`, `/admin/consultancy`, `/admin/settings`). Shared admin UI kit: `src/components/admin/ui.tsx`. The old `AdminPortalView` was removed.
- **Research** (`/admin/research`): add/edit/hide/delete papers (one "title or full citation" field, category or **+ New category**, year, https link). Categories can be renamed, retagged, reordered, hidden, and deleted when empty. A new category becomes a new home-page card.
- **Consultancy** (`/admin/consultancy`): add/edit/hide/remove projects per section, with client name and an image upload (JPEG/PNG/WebP ≤ 2 MB, content-checked, random name, saved to `<webroot>/uploads/projects`, a folder that never runs scripts).
- **Live numbers:** new `GET /api/content/stats`. The hard-coded "97 publications · 15 research fields", "After 97 publications", "Fifteen fields…", "9 client projects" and the `CLIENTS` list now come from the database. The `/research` meta description no longer names a number.
- **Migration 022:** `publications.created_at` and `consultancy_projects.client_name` (backfilled for the 9 clients).
- **Fresh-eyes review** (course lesson 41, a separate read-only agent): no critical issues. The confirmed fixes are in:
  - uploads folder made world-readable (0755);
  - DEPLOY: `uploads/` is live content (never delete; backed up nightly);
  - cron sweeps uploads that were never saved;
  - atomic category delete;
  - modal focus and trap, drawer Escape/aria;
  - reorder renumbers;
  - fallbacks when stats fail;
  - more tests.
- **Tests:** API 83 → 91 (`ContentAdminTest`). New E2E `tests/e2e/admin-content.mjs`: add a paper in a new category plus a project with an image, check the home, Research and Consultancy pages and counts, then remove both.
- **Slices B–E (same branch):**
  - **B. 60-Day registrations** (`/admin/registrations`):
    - one filter row (date range, program, status, schedule, search) drives the tiles, the hand-drawn charts (per day by program, program, status, schedule, age, struggles, cities), the table and the CSV export;
    - `GET /admin/registrations/stats`; cohort and date filters (ADM-4);
    - program colours checked for colour-vision deficiency.
  - **C. Participants & results** (`/admin/participants[/:ref]`):
    - every assessment with the account name and email, or "Guest" + nickname;
    - status, progress, flags and strongest traits;
    - the detail shows demographics, timing, quality, the 16 factors and 5 domains, and every answer (failed attention checks marked);
    - two streamed CSVs (scores, and scores plus all 166 answers, matched by item code, with an "Item set" column);
    - viewing someone's answers is audited (`ADMIN_VIEWED_ASSESSMENT`); the owner's share token is never sent (ADM-2, ADM-3).
  - **D. Private visitor counter** (`/admin/visitors`): migration 023.
    - `POST /api/visit` from every page change, after the sign-in state is known;
    - nothing personal is stored: no cookie, IP, user agent or account id. A visitor is an HMAC with a **random salt per UTC day that the cron deletes** after the day, plus a signed-in yes/no;
    - known pages only (others → `/other`, ids → `*`);
    - skipped for admins, bots, automated browsers, and Global Privacy Control / Do Not Track;
    - raw rows kept 90 days, daily totals kept for good;
    - Privacy Policy gained one sentence.
  - **E. Overview dashboard** (ADM-1): visitors, tests (7/30/all-time, completion rate, flags), accounts, registrations, content counts, new messages and the latest activity in plain words.
  - **Fresh-eyes review of B–E:** no critical issues; 4 major issues confirmed and fixed:
    - the counter stored account ids;
    - the admin detail sent share tokens;
    - a stale table after quick filter changes;
    - export columns across question-set versions.
    
    Minor fixes: name hidden for anonymised accounts, path allowlist, one `/auth/me` on the first visit, admins not counted, a 1-year range cap, tooltips inside scrolling charts, chart accessibility.
  - Dev fix: Vite watched `api/storage/mail` and reloaded the page whenever an email preview was written; it now watches only the frontend.
  - **Tests:** API 91 → 103. New E2E: `admin-registrations.mjs`, `admin-participants.mjs`, `admin-visitors.mjs`.
- **Slice G. Admin two-step sign-in (ADM-12, same branch):** migration 024.
  - **Every admin sign-in** (password or Google) needs a 6-digit code from an authenticator app. Until the code passes, the session is "pending": the server treats it as signed out, with no admin access.
  - **First sign-in:** set up the app (QR code, or a typed key) → confirm a code → **10 recovery codes** shown once (copy / download, "I have saved them" check).
  - **Later sign-ins:** the code, or a recovery code (single use; the admin is emailed with how many are left).
  - **Security page** (`/admin/security`): status, codes left, "Create new recovery codes", "Move to a new phone". Each needs a current code (or a recovery code, for a lost phone). Moving signs out the admin's other devices.
  - **Server reset:** `create-admin.php --reset-2fa <email>` for an admin who lost both phone and codes. It signs them out everywhere, and they set it up again at the next sign-in.
  - **Protection:**
    - TOTP per RFC 6238 in plain PHP; the secret encrypted with AES-256-GCM (key from `app.secret`); recovery codes stored as SHA-256 only;
    - a code can't be used twice (`totp_last_step`);
    - 5 wrong codes per 15 minutes lock the step; 30 attempts per IP;
    - the pending step lasts 10 minutes and ends if the password changes or the account is disabled;
    - a session promoted to admin mid-way loses access until it signs in with a code;
    - security emails for each change; everything audited (`AUTH_2FA_*`).
  - **New npm package:** `qrcode` (owner-approved), plus its type definitions for development. It loads only on the 2FA screens; the main bundle didn't grow.
  - **Fresh-eyes review:** no critical issues; 1 major issue confirmed and fixed. The second-step mark was not tied to an account, so if another person signed in on the same browser and was later promoted, they skipped the code. The mark now holds the admin's id and is dropped whenever the role isn't admin.
    Minor fixes:
    - attempts are counted before the check (no parallel bypass of the limit);
    - a just-used code gets its own message, not a strike;
    - a clear message and a log entry when the stored secret can't be decrypted;
    - each ciphertext is bound to its account;
    - setup secrets are encrypted in the session file.
  - **Tests:** API 103 → 123 (RFC 6238 test vectors included). New E2E `admin-2fa.mjs`; shared helper `admin-signin.mjs` (plays the authenticator app). The four admin E2E scripts now sign in through the real second step. `phase4-flow.mjs` still expects an admin without 2FA (it is replaced by `admin-flow.mjs` in Finish).
- **Consultancy categories (owner request 2026-10-12, same branch):** migration 025.
  - Admins add, rename, reorder and delete (only when empty) consultancy categories, like research categories. "Add project" can create a new category in the same step.
  - Each category has a **type**:
    - **client work:** counted on the home page; client names are listed under "Clients and partners";
    - **our products in development:** marked "In development" and not counted.

    This replaces the rule that was hard-coded to the "Upcoming Products" section.
  - A category's web address (`/consultancy#…`) never changes, so the old site's redirects keep working.
- **Slice H. Messages, subscribers, FAQs, audit log, question set (ADM-3, 5, 7, 9, 10):**
  - **Messages** (`/admin/messages`): New / Handled / All tabs, search, date range. Open a message to read it in full, use "Reply by email" (opens the email app), and mark it handled (who and when are recorded) or new again. CSV export. The Overview links to it.
  - **Newsletter subscribers** (`/admin/subscribers`): counts (subscribed now, new in 30 days, unsubscribed), search, CSV export. Unsubscribe tokens never leave the server.
  - **FAQs** (`/admin/faqs`): add (category picked from the list, or a new one typed), edit, hide, delete, reorder. The FAQ page follows straight away.
  - **Audit log** (`/admin/audit`): filter by person, action, who (admin, member, visitor, server) and date. Actions are shown in plain words. Read-only: the API has no route that edits or deletes an entry.
  - **Question set & norms** (`/admin/question-set`): the 166 statements (factor, reversed or not, attention checks with their expected answer) and the active norm table (16 factors with mean, SD, n and α; 5 domains). Read-only.
  - **Admin menu** grouped under headings: People & numbers, Inbox, Website content, System.
  - **Fresh-eyes review:** no critical issues; 2 major issues confirmed and fixed.
    - Editing a project in an "in development" category erased its saved client name (the hidden field was sent empty).
    - A paged list could leave the admin on an empty page after handling the last item.

    Minor fixes:
    - the reply link encodes the sender's address;
    - one FAQ reorder at a time;
    - 44 px tap targets;
    - the "new" dot is announced to screen readers;
    - FAQ categories typed in other capitals reuse the existing one;
    - the content E2E cleans up after a failed run;
    - a rollback test no longer depends on the SQL mode.

    Noted, not changed:
    - consultancy category reorder sends one request per category;
    - two admins creating the same category name in the same instant;
    - the tab keyboard pattern.
  - **Tests:** API 123 → 132. New E2E `admin-site.mjs`; `admin-content.mjs` now also adds a project in a new consultancy category, and it removes its admin afterwards.
- **Slice F. Users (ADM-6, ADM-11, AUTH-11):**
  - **List** (`/admin/users`): search by name or email; role and status filters; counts.
  - **Detail** (`/admin/users/:id`): tests (linking to the participant page), 60-day registrations, contact messages, newsletter, and recent activity (with who did it).
  - **Disable or enable:** disabling signs the person out at once.
  - **Anonymise** (an erasure request, typed-email confirmation, can't be undone):
    - removes the name, email and password/Google link everywhere, plus nickname, occupation and own-words gender on tests;
    - registrations lose name, email, phone, city, goal and notes;
    - contact messages, newsletter sign-up and email log are deleted;
    - audit entries naming the address lose those details;
    - **answers and scores are kept**;
    - audited without personal data.
  - **Rules:** nobody acts on their own account; another admin's account is changed only by the primary admin; the primary admin's own account not at all. Admins can't be anonymised (remove admin access first).
- **Slice F2. Multiple admins, one primary admin (owner rule):** migration 026.
  - **Exactly one primary admin,** enforced by a unique key in the database. The first admin is the primary one. **Locally that is the owner's account (user 1).**
  - **Admins page** (`/admin/admins`): the primary admin **adds an admin** (an existing active, email-verified account), **removes** one, or **hands over** the primary role (only to an admin with two-step sign-in). Each needs their authenticator code.
  - **What happens to the person:**
    - added admins are signed out and set up two-step sign-in at their next sign-in;
    - removed admins are signed out and their authenticator is forgotten;
    - everyone concerned gets an email;
    - everything is audited.
  - **Other admins** see the list read-only, and the server refuses them with `PRIMARY_ADMIN_ONLY`.
  - **Server fallback:** `create-admin.php --primary <email>` names a new primary admin (for example if the primary admin has left).
  - **PRD** AUTH-10 and ADM-6 updated for this rule.
- **Fresh-eyes review:** no critical issues; 2 major issues confirmed and fixed.
  - A hand-over racing a removal could leave no primary admin. It now re-checks the target under a row lock and rolls back unless both changes land.
  - The anonymise clean-up of audit details matched similar addresses (`al@x.com` also matched `sal@x.com`). It now matches the exact quoted value.

  Minor fixes:
  - disable and remove check that the account didn't change meanwhile;
  - free-text review comments are erased too;
  - `create-admin.php` refuses unverified or disabled accounts (the E2E helper `promoteToAdmin` confirms the test address first);
  - visible reasons on the Admins page;
  - a retry button on the users list.
- **Tests:** API 132 → 144. New E2E `admin-users.mjs`. It never touches the owner's account, so the primary-only actions are covered by the API tests.
- **Form changes (owner, 2026-10-13):**
  - Before the test, every field is required (name on report, highest education and occupation joined country, age and gender), on the server too.
  - Education has 12 Indian-style levels (Class 10, Class 12, Diploma / ITI, professional degrees, MPhil, postdoc…).
  - The 60-day form asks City **and** Country; age, city and country are required.
  - The pre-test country list starts on India. The 60-day form's country starts empty and must be chosen (owner, 2026-10-15).
  - The 60-day form is one form with 3 tick-boxes (STI, PTI, TTI; at least one). Each ticked program is saved as its own registration and reference; one confirmation email lists them all (owner, 2026-10-15).
  - Placeholders use Indian examples (Rahul Sharma, +91…).
  - A value of only spaces now counts as empty for every required field (`Validator`).
- **Phase 5 finish (2026-10-13):**
  - **Full admin E2E:** `tests/e2e/admin-flow.mjs` replaces `phase4-flow.mjs`. It covers the visitor forms, the admin's code sign-in, the registration, the message, a paper shown live on the site, a participant, maintenance, and a member refused on all 52 admin API routes.
  - **Fresh-eyes review** (feature-reviewer agent): no critical findings. Fixed after confirming each one:
    - Anonymising an account that never verified its email no longer touches registrations, messages or the newsletter row filed under that address (they may belong to the real owner). The account detail doesn't show them either.
    - An admin opening someone's full report never receives the owner's share link, and the view is audited (`ADMIN_VIEWED_ASSESSMENT`, via report).
    - CSV exports were sent as JSON when PHP buffers output (XAMPP and DreamHost default). `Response::streamed()` fixes this, proven by a new check in `admin-site.mjs`.
    - Anonymise refuses if the account changed meanwhile (`ACCOUNT_CHANGED`).
    - The day's visit salt is deleted on the first visit of the next day, even without cron. The visit limit was raised to 1500 per address per hour (mobile networks share addresses).
    - DEPLOY §8 now runs migrations before uploading new code.
  - **Noted, not changed:**
    - A new admin's first sign-in sets up their authenticator (trust on first use, as the PRD designs). Ask new admins to sign in right away.
    - A failure halfway through a CSV export can leave a cut-off file.
  - **Deploy safety:** `api/bin/preflight.php` checks PHP, extensions, production settings, DB, migrations, folders and `.htaccess` without printing secrets (DEPLOY §4).
  - **Tests:** API 148, all admin E2E scripts, guest-flow and edge-cases pass.

---

## 4g. Launch and post-launch (2026-10-19 → 22)

**Launch (2026-10-19), DreamHost:**
- The new site was staged beside the old one (`~/transenigma.com-new`), configured (`~/transenigma-config/config.php`, fresh `app.secret`, company Google client, new support@ password typed on the server), migrated, the primary admin created, preflight `READY`, then switched in with two `mv` commands (about a second of downtime). The old site and a tarball of it are kept on the server.
- Fixes found on the live server: MySQL 8 needs `mysqldump --no-tablespaces` on shared hosting; `Database::connect` sets `sql_mode` and UTC itself, so MySQL 8.4 and local MariaDB behave the same.
- Cron (panel): daily housekeeping, daily backup (database + `uploads/`, 14 days), and from 2026-10-22 the newsletter sender every 10 minutes. Output to `transenigma7@gmail.com`.
- DNS/mail: DMARC record added (SPF/DKIM by DreamHost). Search Console verified (meta tag), sitemap submitted.
- Updates are scripted: `deploy/build-package.sh` locally, then `~/update-site.sh` on the server (backup → maintenance on → migrations → rsync keeping `uploads/`, `.well-known/`, `api/storage/` → preflight → maintenance off). Used for the 2026-10-21 and 2026-10-22 updates.

**Post-launch changes (PR #9, merged 2026-10-22; owner requests):**
- 60-Day programs open to every age (registration age 1–100, an "Under 18" band in the admin charts); the 16PF test keeps its minimum age.
- Reply to contact messages from the admin (emailed from support@, kept in the message's history, marks it handled); the admin writes the subject (pre-filled "Re: …").
- Home heading: "Transcend all ___ / enigmatically", the blank cycling obstacles → problems → limitations letter by letter (CodeRabbit-style, pure CSS, `RotatingWord.tsx`); "Transcend all" never moves. Footer "Our Ventures" column removed. Chart numbers kept inside their cards.
- **Newsletter:** "Newsletter subscribers" became **Newsletter** (tabs Newsletters / Subscribers). Block editor (heading, paragraph with bold/italic/link, image + caption, button, divider), cover image, preview text, preview at desktop/phone width, test to yourself, send. Sending is queued and paced (`mail.newsletter_per_hour`, default 80) by `api/bin/send-newsletters.php`; each email has a personal unsubscribe link and RFC 8058 one-click `List-Unsubscribe` headers (`POST /api/newsletter/one-click`, no CSRF by design). The server builds the email from the blocks and escapes everything typed.
- Maintenance mode is its own switch (saved at once, red bar on every admin page while on); it was never saved by the old form. Back after a finished test leaves the test pages. Old in-app phone browsers get hex colour fallbacks. Real favicon for Google.
- CodeRabbit/CodeAnt reviews of PR #9: all findings fixed (one-click unsubscribe limited per token, not per IP; drafts locked against a concurrent Send; re-checks before each email; https-only links; reply saved before it is emailed…), the last ones on `fix/review-followups`.

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

### Phase 5 — Admin console (done)
- [x] Dashboard: tests started and completed, completion rate, flagged sessions, new users, new messages, recent audit events.
- [x] Participants: search and filters, detail view (demographics, timing, quality, 16 + 5 scores, item answers). Streamed CSV including optional item answers.
- [x] Users: list and search, view, disable/enable; admin rights by the primary admin only (slices F, F2).
- [x] Contact messages: list, mark handled. Newsletter subscribers: list and export (slice H).
- [x] FAQs: create, edit, delete, reorder, publish (slice H).
- [x] Question set and norms: read-only view. Audit log: filters (slice H).
- [x] **ADM-11 Anonymise user:** for erasure requests; removes personal data, keeps answers (slice F).
- [x] **ADM-12 Admin two-factor sign-in:** authenticator app (TOTP) plus recovery codes (slice G).

### Phase 6 — UI polish (done)
- [x] **Faster first load:** every page except the home page is lazy-loaded (`src/lib/lazyPage.ts`, one reload if a tab outlives a redeploy). Main JS 541 KB → 381 KB (115 KB gzip); the size warning is gone. Admin bundle was already separate.
- [x] **Navbar:** "Take Test"/"Continue" hidden inside the test; phone buttons 44 px. Home browser title (owner wording): "Transenigma | Research, Technology and Well Being".
- [x] **Admin tidy:** Participants and Registrations use the shared 44 px `Pager`; FAQ/category move buttons 44 px; one query helper in `src/api/admin.ts`; all four CSV exports (registrations, assessments, messages, subscribers) written by `api/src/Support/Csv.php`. Every download kept.
- [x] **Accessibility (WCAG 2.1 AA) and phone pass:** `tests/e2e/a11y.mjs` (axe-core, dev-only, owner-approved) passes on all 17 public pages at 360/390/768/1440 px. Fixes: white text on teal now uses teal-700 (teal-600 was 3.7:1); footer grey and small slate-400 text one shade darker; every control 44 px below 1024 px; 16 px text in phone inputs.
- [x] **Bug found by the pass:** the test page could jump back from "A little about you" to the consent step when an older start-up reply arrived late (`AssessmentPage` now ignores stale loads).
- [x] Per-page titles/descriptions, sitemap and robots: checked, already complete (slice S10).
- Note: the test timer (restored 2026-10-05) shows active time and continues from the saved total after resume (`SessionState.activeSeconds`).
- [ ] *Suggestion, not yet approved:* personalised growth recommendations based on actual scores.
- Owner decisions 2026-10-16: no scoring note on the results page; scoring option A approved.
- [x] **Scoring option A (branch `feature/percentile-stens`, built 2026-10-16):** norm set `ipip16-op2019-v2` reads each trait's sten from the real distribution of the same 35,338 people (migration 027, `factor_stens`); the 5 global scores keep 2z + 5.5. Finished tests keep v1 and their stored scores (checked: every stored score unchanged, including TE-LCHUHZ). On the norm sample the sten/percentile contradiction falls from 9.0 % to 0 %; 9.6 % of trait scores move, always by one. Copy: How It Works bullet "Stens read from the real score spread of 35,338 people"; admin norms page explains the method. Deploy: `migrate.php` applies 027 with the rest.

### Phase 7 — Production and deploy (DreamHost): done 2026-10-19 (§4g)
- [x] Production config outside the web root; database migrated; primary admin with two-step sign-in.
- [x] Cron jobs: housekeeping, backup with 14-day rotation, newsletter sender.
- [x] HTTPS, SMTP, SPF/DKIM/DMARC, Google sign-in on the company client, Search Console.
- [x] Live checks (redirects, health, security headers, blocked private paths) and the owner's manual checklist.
- [ ] Not done, by decision: per-page titles in the first HTML (deferred 2026-10-21; Google renders the pages).
- [ ] Optional later: Cloudflare in front (`app.trust_cloudflare` exists).

### Open after launch
- Company ownership of every account, new SSH password, GitHub repository transfer: [HANDOVER.md §2, §7](HANDOVER.md).
- Delete the test accounts and registrations made during the live checks.
- Delete the old site's folder and tarball on the server when nobody needs them.

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

| Item | Status |
|---|---|
| Domain, support mailbox, SMTP, production MySQL, SSH | ✅ Done; in use on the live site |
| Google OAuth | ✅ Company client on the live site. The older client on a personal Gmail project is for local development only: reset its secret or delete it |
| Account ownership and access for the company | Open: see [HANDOVER.md §2](HANDOVER.md) |
| Primary admin hand-over before the current one leaves | Open: Admins page → Make primary ([HANDOVER.md §3](HANDOVER.md)) |

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
- **API:** `C:\xampp\php\php.exe api\tests\run.php` gives **163 passing tests** (2026-10-22). They run on the `transenigma_test` database, which is wiped on every run.
- **Browser:** the scripts in `tests/e2e/` (see its README). The ones touched most recently: `admin-newsletter.mjs`, `admin-site.mjs`, `back-after-test.mjs`, `home-top.mjs`, `admin-flow.mjs`, `a11y.mjs`. They create `@example.com` rows and remove them at the end. `redirects.mjs https://transenigma.com` checks the live redirects without creating data.
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
| 2026-10-19 | Launch on DreamHost (staged beside the old site, switched with `mv`). |
| 2026-10-21 | 60-Day programs open to every age (no note on the site). Replies to messages from the admin. Hero line "Transcend all obstacles, problems and limitations enigmatically". Footer "Our Ventures" removed. Per-page titles in the first HTML: not now. |
| 2026-10-22 | Animated hero heading (three words, "Transcend all" stays still). Reply subject written by the admin. Newsletter composer and paced sending; scheduling left out. |

---

## 12. Known limitations / notes
- Changing "items per page" while people are mid-test changes the page numbers they see. Answers are never lost, and resume opens the first unanswered page.
- The admin tabs Participants, Question Set and Audit Log show "Phase 5" notices by design.
- `app.url` in the config must be the public site URL. Email links and the Google redirect are built from it.
- Headless Chrome with the CLI `--screenshot` flag can't go below 512 px wide. The e2e driver uses the DevTools protocol for true mobile sizes.
- Python in this repo (`docs/scoring/*.py`) is a developer tool only. It is never deployed.
