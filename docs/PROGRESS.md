# Wellness — Progress Tracker

The living status of the build. **Update this file at the end of every phase.**
Plan of record: [PRD.md](PRD.md) · Local setup: [DEVELOPMENT.md](DEVELOPMENT.md)

_Last updated: 2026-10-05 (Phase 3 complete, Phase 4 not started)_

---

## 1. How to resume work (read this first)

1. **Read** `docs/PRD.md` (what we are building), then this file (where we are).
2. **Working rule agreed with the owner:** get explicit approval before each phase, and show the result at the end of each phase. Never commit without the owner's OK.
3. **Start the local environment** (XAMPP Apache + MySQL must be running):
   ```
   C:\xampp\php\php.exe api\bin\migrate.php      # apply any new migrations
   C:\xampp\php\php.exe api\tests\run.php        # all API tests must pass
   npm run lint                                  # TypeScript check
   npm run dev                                   # http://localhost:3000
   ```
4. **Branch:** `feature/backend-foundation-auth`.
   - Phases 1–2 are committed (`e128497`).
   - Phase 3 is **not committed yet** (waiting for the owner's OK).
5. **Local databases:** `wellness16pf` (app) and `wellness16pf_test` (wiped by tests). **Never touch** the older `wellness` / `wellness_test` databases; they belong to the separate `wellness-project` folder.

---

## 2. Phase status

| Phase | Scope | Status |
|---|---|---|
| 0 | PRD (`docs/PRD.md`) | ✅ Approved (v1.2) |
| 1 | Foundation: PHP core, schema, IPIP items + norms, `.htaccess`, cleanup | ✅ Done, committed |
| 2 | Authentication: sign-up/in/out, verification, reset, Google OAuth, roles, admin CLI | ✅ Done, committed (live email and Google wait on credentials) |
| 3 | Assessment and results: server sessions, scoring, guest flow, results gate, sharing, My Results | ✅ Done, **not committed yet** |
| 4 | 60-Day Challenge (STI, TTI and **PTI**) and site forms (contact, newsletter, FAQ, settings, maintenance) | ⏳ Next. Content changes requested, see §5 |
| 5 | Admin console on server data (+ anonymise user, admin 2FA) | ⬜ Not started |
| 6 | UI polish, SEO, accessibility, consistency pass | ⬜ Not started |
| 7 | Production hardening and DreamHost deploy | ⬜ Not started |

### What each finished phase delivered
- **Phase 1**
  - PHP core in `api/src/Core`: router, validation, sessions, CSRF protection, rate limiting, logging.
  - Migrations `001`–`003`: all tables, the 163 IPIP items + 3 attention checks, norms from 35,338 respondents, settings and FAQs.
  - Locked-down `api/.htaccess`, and the production `public/.htaccess` (real URLs, HTTPS, security headers, caching).
  - Removed: the researcher portal, campaigns, deletion requests, the standalone Sonic page, demo data and unused Node packages.
- **Phase 2**
  - `AuthService`: Argon2id passwords, lockout after 5 failures, session versioning, admin idle timeout.
  - `TokenService`: single-use, hashed tokens for verification and reset links.
  - `GoogleOAuth`: server-side flow with state + PKCE.
  - `Mailer`: PHPMailer over SMTP, or a log file in `api/storage/mail/` while SMTP isn't configured.
  - `bin/create-admin.php`.
  - React: real URLs (react-router), `AuthContext`, onboarding-style pages (login, signup, forgot, reset, verify) and the account page.
- **Phase 3**
  - `ScoringService` matches the Python reference (`docs/scoring/golden.json`) exactly.
  - `QualityService`: attention checks, straight-lining and speed flags.
  - `AssessmentService`: start, autosave, resume, abandon, submit, review, and attaching guest tests to an account at sign-in.
  - `ResultsService`: report, history, share links. Daily cron script `bin/cron-daily.php`.
  - React: `AssessmentPage` (consent, demographics, questions, review, completed), `useAutosave` (offline queue), `ActiveSessionContext`, and pages for the results gate, report, shared report and My Results.
  - Tests: 45 API tests, plus a real-browser run of the full guest → sign-up → report journey.

---

## 3. Prototype faults (from the first analysis) — status

| # | Fault | Status |
|---|---|---|
| 1 | Passwords never checked | ✅ Fixed (P2) |
| 2 | Anyone could become admin; any admin login accepted | ✅ Fixed (P2) |
| 3 | Fake Google login | ✅ Fixed (P2), needs the Client ID to go live |
| 4 | Results page could show another person's results | ✅ Fixed (P2/P3) |
| 5 | Sign-up with an existing email signed into that account | ✅ Fixed (P2) |
| 6 | Forgot password did nothing | ✅ Fixed (P2), real sending needs SMTP |
| 7 | Global domains ignored the sign of each factor | ✅ Fixed (P3) |
| 8 | Submit allowed with 10/163 answers | ✅ Fixed (P3) |
| 9 | Invented norms / AI-written items | ✅ Fixed (P1/P3) |
| 10 | Admin "items per page" / "min age" settings ignored | 🟡 Server honours them (P3); admin UI to change them comes in P5 |
| 11 | Campaign links not validated | ✅ Removed with campaigns (P1) |
| 12 | Resume only for signed-in users | ✅ Fixed (P3) |
| 13 | "Start fresh" deleted data; page time hard-coded | ✅ Fixed (P3) |
| 14 | Terms link left the consent step; footer Terms opened Privacy | ✅ Fixed (P2/P3) |
| 15 | STI registrations invisible to admin | ⏳ Phase 4 |
| 16 | Wrong program details saved (STI format, TTI track, timing) | ⏳ Phase 4 |
| 17 | Registrations auto-"confirmed", duplicates, no email | ⏳ Phase 4 |
| 18 | Data with no admin UI | ⏳ Phase 5 |
| 19 | Newsletter not saved; maintenance mode only local | ⏳ Phase 4 |
| 20 | Auth changes didn't refresh the UI | ✅ Fixed (P2) |
| 21 | No real URLs | ✅ Fixed (P2) |
| 22 | Demo data mixed with real data | ✅ Fixed (P1) |
| 23 | Wrong labels/thresholds (5-x, 50 % chip, top traits) | ✅ Mostly fixed (P3); the admin item-key label returns with P5 |

---

## 4. Pending work by phase

### Phase 4 — 60-Day Challenges and site forms
- [ ] **Three programs: STI, TTI, PTI.** Rewrite the copy and add photos (owner request 2026-10-05, §5). Header text "Our Two…" becomes "Our Three…". Filter tabs: All (3) / STI / TTI / PTI.
- [ ] Migration: `challenge_registrations.program` ENUM gains `PTI`. Reference code `PTI-60-XXXXXX`. PRD CH-1, CH-2 and CH-7 to be updated to three programs.
- [ ] Registration API: one form for all 3 programs, every chosen value saved correctly (F16).
- [ ] "Registered successfully 🎉" + reference code + confirmation email.
- [ ] Duplicates blocked: same email and same program while a registration is active (F17).
- [ ] Status starts at `registered`; admins manage it (F17).
- [ ] `challenge_registration_open` setting respected.
- [ ] Contact form API: honeypot, minimum fill time, rate limit, notification email to support.
- [ ] Newsletter API: subscribe, unsubscribe link, no duplicates (F19).
- [ ] FAQs served from the database (`GET /api/faqs`).
- [ ] Public settings (announcement, site name) from `/api/settings/public` instead of browser storage.
- [ ] Maintenance mode enforced by the server: 503 page, admins bypass (F19).
- [ ] Remove the remaining browser-storage code for challenge, contact, FAQ and settings (`storageService.ts` should then only hold what admin still needs until P5, or be deleted).
- [ ] Admin console, minimum for P4: registrations list shows all 3 programs, with program filter and status changes on server data. Full rebuild is in P5.

### Phase 5 — Admin console (server data)
- [ ] Dashboard KPIs: tests started/completed, completion rate, flagged, registrations per program, new messages and users.
- [ ] Participants: search, filters, detail view with scores and item answers. Replaces the "coming in Phase 5" notices added in P3.
- [ ] Streamed CSV exports (participants, optional item answers, registrations, messages, subscribers) with formula-injection guard.
- [ ] Registrations (all 3 programs), messages, users (role change, disable), FAQ CRUD, settings, item set and norms view, audit log filters.
- [ ] **ADM-11** "Anonymise user" (erasure requests: keep answers, remove personal data).
- [ ] **ADM-12** Admin two-factor sign-in (TOTP + recovery codes).

### Phase 6 — UI polish
- [ ] Consistency pass on all pages (shared Button, Card and Modal components).
- [ ] Per-page titles and descriptions for SEO.
- [ ] Accessibility pass (WCAG 2.1 AA) and a mobile pass on every page.
- [ ] **Suggestion (not yet approved):** personalised growth recommendations based on the person's actual scores, instead of the current generic three cards.
- [ ] Navbar on the test page: hide the "Take Test" button while inside the test.
- [ ] Lazy-load the admin console (main bundle is ~500 KB, target < 250 KB gzip).

### Phase 7 — Production and deploy
- [ ] DreamHost: production `config.php` outside the web root, MySQL database, `migrate.php`, `create-admin.php`.
- [ ] Cron jobs: `bin/cron-daily.php` daily, plus a daily `mysqldump` backup with 14-day rotation.
- [ ] HTTPS (Let's Encrypt), optional Cloudflare, `app.trust_cloudflare`.
- [ ] Production Google OAuth redirect URI; SMTP; SPF/DKIM checked.
- [ ] Performance: indexes review, caching of items/norms/settings, Lighthouse targets; `securityheaders.com` grade A.
- [ ] `docs/DEPLOY.md` with step-by-step instructions, and a final acceptance checklist (PRD Appendix C) on the live site.

---

## 5. Owner requests in progress

### 2026-10-05 — Challenge content (before Phase 4)
- **STI:** chanting of the Hare Krishna mahamantra, in normal (japa) and musical (kirtan) form. Copy must be smart, scientific and inviting to newcomers. Add a beautiful chanting photo, **not** a brahmachari.
- **TTI:** chanting + reading scriptures (Bhagavad Gita, Srimad Bhagavatam, Chaitanya Charitamrita), with a beautiful photo.
- **PTI (new, third program):** Philosophical Therapeutic Intervention. Philosophical study of the same scriptures to refactor habits and bring lasting constructive change. Must attract modern youth. Needs a photo, a place in the registration form, and admin support.
- **Status:** copy and photo plan proposed to the owner; waiting for approval before building.

---

## 6. Waiting on the owner / their senior

| Item | Needed for | Status |
|---|---|---|
| Domain name | Email links, Google redirect, deploy | Asked senior (message drafted 2026-10-05) |
| Support email + sending mailbox | Contact form, confirmation emails | Asked senior |
| SMTP credentials | Real email sending | Asked senior (enter directly into `config.local.php`, never in chat) |
| Google OAuth Client ID/secret | Google sign-in | Owner will create |
| Production MySQL + SFTP/SSH on DreamHost | Phase 7 | Later |
| Approval of STI/TTI/PTI copy and photos | Phase 4 | Pending |
| OK to commit Phase 3 | Git history | Pending |

---

## 7. Decisions log

| Date | Decision |
|---|---|
| 2026-10-03 | Backend is plain PHP 8.2 + MySQL only. Node is used only to build the frontend. |
| 2026-10-03 | Two roles only (user, admin). No researcher portal, no campaigns, no data-deletion requests (data kept for research). |
| 2026-10-03 | Hosting: DreamHost, one domain for the site and `/api`. |
| 2026-10-03 | Guests may take the test; results require an account. |
| 2026-10-03 | Replace the AI-written items with the real 163 IPIP items + 3 attention checks; norms from Open Psychometrics (credited). |
| 2026-10-03 | Email verification doesn't block access. Minimum age 18. Erasure requests are handled by anonymisation. Admin 2FA approved. |
| 2026-10-05 | A third 60-day program, PTI, is added. STI = Hare Krishna mahamantra chanting; TTI = chanting + scripture reading; PTI = philosophical study. |
| 2026-10-05 | A non-owner viewing someone's report gets 404 (not 403), so existence isn't revealed. |

---

## 8. Known limitations / technical notes
- Changing `items_per_page` while people are mid-test changes the page numbers they see. Answers are never lost, and resume reopens the first unanswered page.
- The Phase 3 admin tabs **Participants** and **Question Set** show a "coming in Phase 5" notice by design.
- `app.url` must be the public site URL. Email links and the Google redirect are built from it.
- Headless Chrome won't render narrower than 512px with the CLI `--screenshot` flag. Use the DevTools-protocol driver for true mobile screenshots.
