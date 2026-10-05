# Wellness — Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | Wellness: 16 Personality Factors assessment + 60-Day Transformation Challenge (STI & TTI) |
| **Version** | 1.2 (owner decisions applied; Phase 3 clarifications) |
| **Date** | 2026-10-03 |
| **Stack** | React 19 + Vite + Tailwind (static build) · PHP 8.2+ (plain, no framework) · MySQL 8 / MariaDB 10.4+ |
| **Hosting** | DreamHost (shared or VPS), single domain, HTTPS |
| **Status rule** | Every phase ends with a demo and explicit owner approval before the next phase starts. |

---

## 1. Goals and scope

### 1.1 Goals
1. Turn the AI-Studio prototype, which stores everything in `localStorage`, into a production web app with a real PHP + MySQL backend.
2. Deliver a **psychometrically valid** 16PF assessment that uses the public-domain IPIP items and real population norms.
3. Provide secure accounts for two roles (**user** and **admin**), including email/password and real Google sign-in.
4. Run **60-Day Challenge** registration for both tracks (**STI** Sonic Therapeutic Intervention and **TTI** Transcendental Therapeutic Intervention).
5. Give admins a complete console covering participants, results, registrations, messages, users, FAQs, settings and the audit log.
6. Make the site fast, secure and reliable for users worldwide, with a modern, consistent UI in the spirit of 16personalities.com and syngrity.com.

### 1.2 In scope
Public website, assessment (guest and signed-in), results and history, authentication, 60-Day Challenge (STI + TTI), contact form, newsletter, FAQ, admin console, deployment to DreamHost.

### 1.3 Removed from the prototype
| Item | Reason |
|---|---|
| Researcher portal, researcher accounts, campaigns (`?campaign=` links) | Only two roles: user and admin |
| Data-deletion requests | Data is retained for research (disclosed in the Privacy Policy and consent) |
| Standalone Sonic Therapy page (`SonicTherapeuticSection.tsx`) | STI lives inside the 60-Day Challenge section |
| Demo data, "Member Demo" / "1-Click Admin" buttons, fake Google login | Not acceptable in production |
| Unused Node packages (`express`, `dotenv`, `@google/genai`, `tsx`, `@types/express`) | The server runs PHP only |

### 1.4 Out of scope for v1
Payments, multiple languages (the UI is English; data handling is Unicode-safe so it can be translated later), native mobile apps, PDF generated on the server (the browser's print-to-PDF is used).

---

## 2. Roles and permissions

| Capability | Guest | User | Admin |
|---|:-:|:-:|:-:|
| Browse public pages, FAQ, factor directory | ✓ | ✓ | ✓ |
| Take / autosave / resume the assessment | ✓ (same device, via cookie) | ✓ (any device) | ✓ |
| **View own results** | ✗ → must sign up or sign in | ✓ | ✓ |
| Results history ("My Results"), share link | ✗ | ✓ | ✓ |
| Register for the 60-Day Challenge (STI/TTI) | ✓ | ✓ (prefilled, linked to account) | ✓ |
| Contact form, newsletter | ✓ | ✓ | ✓ |
| Admin console (`/admin/*`) and admin APIs | ✗ | ✗ | ✓ |
| Change user roles / disable accounts | ✗ | ✗ | ✓ (cannot demote or disable themselves) |

Every permission is **enforced on the server**. Hiding things in the frontend is cosmetic only.

---

## 3. Psychometric specification (scoring)

### 3.1 Instrument
- **Items:** the 163 public-domain IPIP items that measure Cattell's 16 factors, as used by the Open Psychometrics 16PF test. The full list is in [`docs/scoring/ipip16_items.tsv`](scoring/ipip16_items.tsv).
- Every factor has 10 items, except B (Reasoning), which has 13. Each factor has a fixed mix of positively and negatively keyed items, matching the IPIP table.
- **Attention checks:** 3 extra items, for example *"To show you are paying attention, select 'Agree'."* They are not scored and are used only for quality flags.
- **Items shown:** 166.
- **Response scale:** 5 points (1 Strongly Disagree … 5 Strongly Agree), rendered as the existing circle UI.
- **Order:** items rotate through the factors (A1, B1, C1 … Q4-1, A2, …) so that one factor's items never sit together. The attention checks sit at fixed positions (around 35, 85 and 135).
- **Paging:** `items_per_page` is an admin setting (default 7, allowed 5–10). With 7 per page, 166 items make 24 pages, the last one holding 5.
- The item set is versioned (`item_set_version = 'ipip16-v1'`) and every session stores the version it used.

The current AI-written statements in `src/data/questionsData.ts` are **replaced**. They have no norms, so they cannot produce valid scores.

### 3.2 Norms
- **Source:** Open Psychometrics 16PF open dataset.
- **Sample:** 35,338 complete responses from people aged 13–100.
- **Version:** `norm_version = 'ipip16-op2019-v1'`.
- **Reproducibility:** derived by [`docs/scoring/derive_norms.py`](scoring/derive_norms.py); the output is [`docs/scoring/norms.json`](scoring/norms.json).
- **Attribution:** credited in the footer and on the Methodology/FAQ page.

| Factor | Name | Items | Mean (raw) | SD | Reliability (α) |
|---|---|:-:|:-:|:-:|:-:|
| A | Warmth | 10 | 36.91 | 6.29 | .84 |
| B | Reasoning | 13 | 48.43 | 6.72 | .77 |
| C | Emotional Stability | 10 | 33.35 | 7.57 | .86 |
| E | Dominance | 10 | 35.02 | 6.31 | .82 |
| F | Liveliness | 10 | 33.01 | 6.66 | .79 |
| G | Rule-Consciousness | 10 | 31.41 | 7.17 | .81 |
| H | Social Boldness | 10 | 31.66 | 8.55 | .90 |
| I | Sensitivity | 10 | 35.09 | 5.83 | .67 |
| L | Vigilance | 10 | 28.70 | 6.93 | .85 |
| M | Abstractedness | 10 | 34.95 | 6.29 | .78 |
| N | Privateness | 10 | 29.60 | 8.16 | .88 |
| O | Apprehension | 10 | 31.75 | 7.48 | .85 |
| Q1 | Openness to Change | 10 | 37.99 | 5.77 | .77 |
| Q2 | Self-Reliance | 10 | 33.62 | 6.77 | .84 |
| Q3 | Perfectionism | 10 | 31.51 | 6.50 | .79 |
| Q4 | Tension | 10 | 28.29 | 6.68 | .80 |

Norms are stored in the database (`factor_norms`, `factor_percentiles`, `domain_norms`), not hard-coded. A future norm version (for example, one built from our own participants) can then be added without code changes, and historic results keep the version they were scored with.

### 3.3 Algorithm (implemented in PHP only; the browser never computes scores)
For each factor *f*:
1. **Item score:** positively keyed items score `answer`; negatively keyed items score `6 − answer`.
2. **Raw score:** `raw_f` = the sum of the item scores. Range: 10–50 (13–65 for B).
3. **z-score:** `z_f = (raw_f − mean_f) / sd_f`.
4. **Sten:** `sten_f = clamp(round(2·z_f + 5.5), 1, 10)`, the standard ten scale with mean 5.5 and SD 2, as used by the official 16PF.
5. **Percentile:** looked up from the **empirical** table in `factor_percentiles` (mid-rank percentile for each possible raw score), not from a normal approximation.
6. **Band:** sten 1–3 = `low`, 4–7 = `average`, 8–10 = `high`.

**Global factors (the five domains).** Each domain combines its factors with a signed weight (+1 or −1). This fixes prototype fault #7, which ignored the minus signs.

| Code | Domain | Composite `G = Σ w·z_f` |
|---|---|---|
| EX | Extraversion | +A +F +H −N −Q2 |
| AX | Anxiety | −C +L +O +Q4 |
| TM | Tough-Mindedness | −A −I −M −Q1 |
| IN | Independence | +E +H +L +Q1 |
| SC | Self-Control | −F +G −M +Q3 |

For each domain: `z_G = (G − mean_G) / sd_G`, using the population mean and SD of the composite (from `norms.json`; for example EX has SD 3.89). Then `sten_G = clamp(round(2·z_G + 5.5), 1, 10)`, with the same bands as above.

**Completeness rule:** a session can only be submitted when **all 166 items** are answered. There is no partial scoring (fixes #8).

### 3.4 Response quality flags (stored; shown to admins and, gently, to the user)
| Check | Rule | Default |
|---|---|---|
| Attention checks | Number of the 3 checks answered wrongly | flag if ≥ 2 |
| Straight-lining | Share of items given the single most common answer | flag if ≥ 85 % |
| Too fast | Total active time (sum of page times) | flag if < `too_fast_minutes` (admin setting, default 6) |

A flagged session is still scored. The report shows the note "results may be less reliable". Admin lists can filter on flags.

### 3.5 Golden tests
The PHP scoring engine must reproduce the Python reference values for a fixed set of answer vectors: all 1s, all 5s, all 3s, alternating answers, and five real rows from the dataset. These are included as automated PHP tests.

---

## 4. Functional requirements

IDs are referenced by phases and test cases. **(F#)** marks a prototype fault that the requirement fixes (see Appendix B).

### 4.1 Authentication and accounts — `AUTH`
| ID | Requirement |
|---|---|
| AUTH-1 | **Sign up** with name, email and password. Email is case-insensitive and unique. Password: 8–128 characters, rejected if it appears on a list of common passwords. Hashing uses `password_hash` (Argon2id if available, otherwise bcrypt). **(F1, F5)** |
| AUTH-2 | Signing up with an existing email returns a generic error ("An account with this email already exists — sign in instead"). It never signs the person into that account. **(F5)** |
| AUTH-3 | **Sign in** with email and password. A failed sign-in always shows the same message, so it doesn't reveal which emails have accounts. Lockout: 5 failures per email+IP in 15 minutes locks that pair for 15 minutes. **(F1)** |
| AUTH-4 | **Google sign-in:** OAuth 2.0 Authorization Code flow with `state` and PKCE, handled entirely by PHP (`/api/auth/google/start` → Google → `/api/auth/google/callback`). The `id_token` claims (`iss`, `aud`, `exp`, `email_verified`) are validated. The account is matched by `google_sub` first, then by verified email; if neither matches, a new account is created. A Google-only account has no password until the user sets one through "forgot password". **(F3)** |
| AUTH-5 | **Email verification:** a link is emailed at sign-up (single use, valid 48 h). It does **not** block use of the site (see open point O-1). Users can request a new link from their account. |
| AUTH-6 | **Forgot / reset password:** always responds "If an account exists, we've emailed a link". The emailed token is single use, valid 60 minutes, and stored only as a SHA-256 hash. A successful reset signs out all of that user's other sessions. **(F6)** |
| AUTH-7 | **Sessions:** native PHP sessions stored server-side. Cookie `wl_sid` has `HttpOnly`, `Secure` (in production) and `SameSite=Lax`. The session ID is regenerated at sign-in. Lifetime is 30 days, renewed on activity; admins have a 12 h idle timeout. |
| AUTH-8 | **CSRF:** a token is issued per session (returned by `GET /api/auth/me`) and must be sent as the `X-CSRF-Token` header on every request that changes data. The `Origin` header must match the site. |
| AUTH-9 | **Sign out** destroys the server session. The UI updates immediately through a global auth context. **(F20)** |
| AUTH-10 | **Roles:** `user` or `admin`. The first admin is created from the command line (`php api/bin/create-admin.php you@domain.com`). After that, admins can promote or demote users from the console. No email pattern ever grants a role. **(F2)** |
| AUTH-11 | **Disabled accounts** cannot sign in, and any active sessions are rejected on their next request. |
| AUTH-12 | **Account page** (`/account`): change name, change password (current password required), resend verification, view own challenge registrations. |
| AUTH-13 | Every sign-in, sign-up, password reset, role change and lockout is written to the audit log. |

### 4.2 Assessment — `TEST`
| ID | Requirement |
|---|---|
| TEST-1 | **Consent step:** two required checkboxes (terms/privacy; "not a clinical diagnosis") plus a clear notice that **anonymised responses are retained for research**. The consent version and timestamp are stored. The Terms and Privacy links open in a modal or new tab so the person doesn't lose their place. **(F14)** |
| TEST-2 | **Demographics:** country (full ISO 3166 list), age (18 up to 100; the `min_age` setting cannot go below 18), gender (+ optional self-describe text), optional nickname, education and occupation. All are validated on the server. **(F10)** |
| TEST-3 | **Start:** creates a `test_session` with a public reference `WL-XXXXXX` (6 characters from a 32-character alphabet that avoids lookalikes such as 0/O and 1/I, generated with a cryptographically secure random function and guaranteed unique). For a guest, a random 32-byte guest token is set in the `wl_guest` cookie (HttpOnly, 30 days) and stored only as a hash. For a signed-in user, the session is linked to `user_id`. |
| TEST-4 | **One active session:** each user or guest has at most one `in_progress` session. Opening `/test` with one in progress offers **Resume (x %)** or **Start over**. "Start over" marks the old session `abandoned`; it is kept, not deleted. **(F12, F13)** |
| TEST-5 | **Autosave:** answers are sent in batches (about 800 ms after the last click, and immediately when the page changes) to `PUT /api/test/session/answers`, together with the current page and the real seconds spent on it. The server accepts only values 1–5 and item IDs from the session's item set, and only for the session's owner. The UI shows "Saving… / Saved ✓ / Offline – will retry". Unsent answers are queued in the browser and retried once the connection is back. **(F13)** |
| TEST-6 | **Resume:** a signed-in user can resume on any device. A guest can resume on the same browser through the cookie. If a guest signs in mid-test, the guest session is attached to their account. |
| TEST-7 | **Navigation:** Next is blocked until every item on the page is answered (the first missing item is highlighted). Back is free. A review screen shows a map of all pages; any page can be revisited. Keyboard keys 1–5 and Enter work as now. |
| TEST-8 | **Submit:** `POST /api/test/session/submit` requires all 166 answers, is idempotent, scores on the server (§3), computes quality flags and sets status to `completed`. **(F8)** |
| TEST-9 | **Results gate:** a guest who submits sees a "Your profile is ready" screen with a teaser (for example, a blurred chart) and **Sign up / Sign in** buttons. After authenticating, all completed and in-progress guest sessions tied to that cookie are attached to the account, and the user is redirected to the report. |
| TEST-10 | **Inactive sessions:** sessions `in_progress` with no activity for 30 days are marked `expired` (a daily cron job, plus a check whenever a session is accessed). |
| TEST-11 | **Experience rating:** 1–5 stars plus an optional comment (max 1000 characters), one per session, after submission. |
| TEST-12 | **Retake:** allowed at any time; each attempt is a new session in the history. |

### 4.3 Results — `RES`
| ID | Requirement |
|---|---|
| RES-1 | `/results/:ref` can be viewed **only by the owner or an admin**. There is no fallback to another person's session. Signed-in non-owners receive **404** (not 403), so a response never confirms that someone else's report exists. **(F4)** |
| RES-2 | **Report content:** header (nickname, date, reference); quality notice if flagged; top distinctive traits (sten ≥ 8) and low-pole traits (sten ≤ 3), consistent with the bands (fixes #23: the prototype used ≥7 / ≤4); 5 global domains; 16 bipolar bars with sten, percentile ("higher than X % of people") and interpretation; filter (All/High/Average/Low); growth recommendations; disclaimer and norm attribution. |
| RES-3 | **My Results** (`/my-results`): a list of all sessions (in progress or completed) with date, status, reference, and View or Resume. |
| RES-4 | **Share link:** off by default. The owner can turn on a read-only public link `/r/:shareToken` (32 random characters) and turn it off again. The shared view hides age, country and the email address. |
| RES-5 | **Print / Save as PDF:** a print stylesheet that produces a clean multi-page report. |
| RES-6 | The prototype's old local `?results=<token>` links are not supported (there was never any server data behind them). |

### 4.4 60-Day Challenge (STI + TTI) — `CH`
| ID | Requirement |
|---|---|
| CH-1 | The section stays on the landing page (`/#challenge`; the nav item scrolls there). It contains two program cards, **STI** and **TTI**, as in the current design. |
| CH-2 | **One registration form for both programs.** Fields: program (STI / TTI), full name, email, phone (with country code, validated), age, city, country, preferred cohort time (morning / evening / weekend), current struggles (multi-select from a fixed list), primary goal (≤ 1000 chars), consent checkbox. Every selected value is saved exactly as chosen. **(F16)** |
| CH-3 | **Free, no payment, sign-in not required.** If the person is signed in, name and email are prefilled and the registration is linked to their account. |
| CH-4 | **On submit, they see "Registered successfully 🎉"** with a reference code (`STI-60-XXXXXX` / `TTI-60-XXXXXX`) and next steps. A confirmation email is sent. |
| CH-5 | **Duplicates:** if the same email already has an active registration for the same program, the person is shown "You're already registered (ref …)" and no duplicate row is created. **(F17)** |
| CH-6 | **Statuses:** `registered` (initial) → `confirmed` / `waitlisted` / `completed` / `cancelled`. Admins manage these and add notes. **(F17)** |
| CH-7 | Both programs are stored in a **single table** with a `program` column, so admins see all registrations in one place. **(F15)** |
| CH-8 | The admin setting `challenge_registration_open` can close registration; the form then shows a "Registration currently closed" message. |

### 4.5 Contact, newsletter, FAQ — `SITE`
| ID | Requirement |
|---|---|
| SITE-1 | **Contact form:** name, email, subject, message (≤ 5000 chars). Saved to the database, and a notification email goes to the support address. Spam protection: hidden honeypot field, a minimum time before submit, rate limit. |
| SITE-2 | **Newsletter:** email only. Saved with status `subscribed`, and a welcome email with a one-click unsubscribe link is sent. Subscribing an address that is already subscribed reports success without creating a duplicate. **(F19)** |
| SITE-3 | **FAQ:** loaded from the database (published items only), with search and category filter. |
| SITE-4 | **Announcement bar and site name** come from the database settings. |
| SITE-5 | **Maintenance mode** is enforced on the server: public endpoints return HTTP 503 and the SPA shows the maintenance page. Admins (and the admin login) keep working. **(F19)** |
| SITE-6 | **Real page URLs** with browser history, deep links and 404 page. Refreshing keeps you on the same page. Each page has its own title and description for search engines. **(F21)** |

### 4.6 Admin console — `ADM`
All lists are paginated, searched and filtered **on the server** (25 per page by default).

| ID | Requirement |
|---|---|
| ADM-1 | **Dashboard:** tests started / completed / completion rate (7d, 30d, all-time), flagged sessions, registrations by program and status, new messages, new users; recent audit events. |
| ADM-2 | **Participants:** search by reference, nickname or email; filter by status, flag, date range, country. Detail view shows demographics, timing, quality flags, the 16 factor and 5 domain scores, and individual item answers. |
| ADM-3 | **Exports (CSV, streamed):** participants with scores, and optionally the 166 item answers (for research); registrations; messages; newsletter subscribers. Spreadsheet formula injection is neutralised. Every export is written to the audit log. |
| ADM-4 | **Challenge registrations:** filter by program (STI/TTI), status, cohort and date; change status; add notes; view the full record. |
| ADM-5 | **Messages:** list and detail; mark handled or unhandled. |
| ADM-6 | **Users:** list and search; view a user (their sessions and registrations); change role; disable or enable. Admins cannot demote or disable themselves. |
| ADM-7 | **FAQs:** create, edit, delete, reorder, publish or unpublish. |
| ADM-8 | **Settings:** site name, support email, announcement text and on/off, maintenance mode, sign-up open, challenge registration open, items per page (5–10), min age, too-fast minutes. Every value is validated, and changes are audited. **(F10)** |
| ADM-9 | **Question set and norms:** read-only view of the item set (key, factor, attention checks) and the active norm table. |
| ADM-11 | **Anonymise user:** removes name, email, nickname and contact details from the user, their sessions and their registrations; keeps answers and scores; cannot be undone; requires confirmation and is audited (O-3). |
| ADM-12 | **Admin two-factor sign-in (TOTP):** an admin must enrol an authenticator app and receives one-time recovery codes; a code is required at each admin sign-in (O-5). |
| ADM-10 | **Audit log:** filter by actor, action and date. It is append-only; no edit or delete in the UI. |

---

## 5. Non-functional requirements

### 5.1 Security (OWASP Top 10 aligned)
- **SQL injection:** all queries use PDO prepared statements, with `ATTR_EMULATE_PREPARES=false` and `utf8mb4`.
- **Input validation:** every input is validated on the server against an allow-list (type, length, enum). Output is JSON only; React escapes rendering.
- **Authorization:** every endpoint declares its required role, and ownership is checked for each session and result. IDs exposed in URLs are random references, not database IDs.
- **Rate limiting:** stored in MySQL, applied to sign-in, sign-up, forgot password, contact, newsletter, challenge registration and answer autosave (generous limits).
- **Security headers** (via `.htaccess`): `Content-Security-Policy` (self + Google Fonts + Google OAuth), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy`.
- **Secrets:** stored in `config.php` **outside the web root**, never committed to git (`config.example.php` is committed). `display_errors=Off` in production; errors are logged to a file outside the web root.
- **IP addresses** are stored only as salted SHA-256 hashes (for rate limiting and audit).
- **CORS:** not needed (same domain); cross-origin requests are rejected.
- **Uploads:** none, so that risk doesn't apply.

### 5.2 Performance and scale
- **Speed targets:** API p95 < 300 ms on DreamHost shared hosting. Initial JS bundle < 250 KB gzipped, with the admin console split into a separate bundle.
- **Database:** indexes on every lookup/filter column; answers stored one row per item with primary key (session, item) and saved as a batch upsert.
- **Caching:** the item set, norms and public settings are cached (APCu if available, otherwise a file cache) and invalidated when changed.
- **Static assets:** hashed filenames with `Cache-Control: max-age=31536000, immutable`; gzip/brotli via Apache.
- **Global reach:** the code is ready for an optional free Cloudflare CDN in front of the site. All times are stored in UTC and shown in the user's local time zone.
- **Growth path:** the same code runs on a DreamHost VPS if traffic outgrows shared hosting.

### 5.3 Reliability and data
- Daily MySQL backups (DreamHost panel plus a cron `mysqldump` with 14-day rotation), and a documented restore procedure.
- Schema changes are versioned migration files (`database/migrations/NNN_*.sql`) applied by `php api/bin/migrate.php`.
- Email is sent through SMTP with PHPMailer (bundled as plain PHP files, no Composer). Failures are logged in `email_log` and never block the user action.
- **Research retention:** responses are kept indefinitely. The Privacy Policy states this, together with the support contact (see open point O-3).

### 5.4 UX and UI
- **Visual direction:** clean, airy and friendly in the style of 16personalities.com, with the credibility of syngrity.com. Keep the current brand palette (teal / indigo / amber, slate neutrals), typography (Poppins headings, Inter body) and the circle answer scale.
- **Shared components:** Button, Input, Select, Checkbox, Card, Modal, Toast, Spinner/Skeleton, EmptyState, Pagination, DataTable, Badge.
- **Auth pages:** full-page onboarding-style screens (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`) with "Continue with Google" at the top, replacing the cramped modal.
- **Required states:** every async action has loading, success and error states; every list has an empty state.
- **Responsive:** 360 px to 1440 px+. **Accessibility:** WCAG 2.1 AA basics (contrast, focus rings, labels, keyboard operation, `aria-live` for save status).
- **Browsers:** last 2 versions of Chrome, Edge, Firefox and Safari; iOS 15+; Android 9+.

---

## 6. Architecture

### 6.1 Repository layout
```
wellness-project-1/
├─ src/                      React app (existing, refactored)
│  ├─ api/                   typed API client (fetch wrapper, CSRF, errors)
│  ├─ context/               AuthContext, SettingsContext
│  ├─ pages/                 one file per route
│  ├─ components/            ui/ (design system), layout/, test/, results/, admin/
│  └─ data/                  factor descriptions (static copy only)
├─ api/                      PHP backend → deployed to <webroot>/api
│  ├─ index.php              front controller (all /api/* requests)
│  ├─ .htaccess              routes everything to index.php
│  ├─ src/
│  │  ├─ Core/               Router, Request, Response, Db, Session, Csrf, RateLimiter, Validator, Config, Logger
│  │  ├─ Controllers/        Auth, Google, Test, Results, Challenge, Contact, Newsletter, Faq, Settings, Admin*
│  │  ├─ Services/           ScoringService, QualityService, Mailer, AuditService, TokenService
│  │  └─ Repositories/       one per aggregate (Users, Sessions, Answers, Registrations, …)
│  ├─ lib/PHPMailer/         bundled library (plain files)
│  ├─ templates/email/       HTML + text email templates
│  ├─ bin/                   create-admin.php, migrate.php, cron-daily.php
│  └─ tests/                 plain-PHP test runner + scoring golden tests + API smoke tests
├─ database/
│  ├─ migrations/            001_schema.sql, …
│  └─ seeds/                 factors, items (ipip16-v1), norms (ipip16-op2019-v1), FAQs, settings
├─ docs/                     PRD.md, scoring/, DEPLOY.md
└─ public/.htaccess          SPA fallback + security headers + caching (copied into dist/)
```

### 6.2 Request flow
- **Production:** `https://domain/` serves the built SPA (`dist/`); any unknown path falls back to `index.html`. `https://domain/api/...` is handled by `api/index.php`.
- **Local:** Vite dev server (port 3000) proxies `/api` to `http://localhost/wellness-project-1/api` (XAMPP Apache). The same PHP code runs locally and in production.
- **Config file:** `config.php` is found in this order: the `WELLNESS_CONFIG` env var path, then `../wellness-config/config.php` (outside the web root), then `api/config/config.local.php` (local development only; blocked by `.htaccess`).

### 6.3 API conventions
- JSON in and out; UTF-8. Success: `{ "ok": true, "data": … }`. Error: `{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "fields": { "email": "…" } } }`.
- **HTTP statuses:** 200/201, 400 validation, 401 not signed in, 403 forbidden/CSRF, 404, 409 conflict (duplicate), 422, 429 rate-limited (with `Retry-After`), 503 maintenance, 500 (generic message; details only in the server log).
- **Pagination:** `?page=1&per_page=25`. Response: `{ items, page, per_page, total }`.

### 6.4 Endpoints
| Method & path | Auth | Purpose |
|---|---|---|
| GET `/api/health` | – | Liveness check (DB ping) |
| GET `/api/settings/public` | – | Site name, announcement, maintenance flag, items per page, min age, registration flags |
| GET `/api/auth/me` | – | Current user (or null) + CSRF token |
| POST `/api/auth/signup` | – | AUTH-1/2 |
| POST `/api/auth/login` | – | AUTH-3 |
| POST `/api/auth/logout` | user | AUTH-9 |
| POST `/api/auth/forgot-password` | – | AUTH-6 |
| POST `/api/auth/reset-password` | – | AUTH-6 |
| POST `/api/auth/verify-email` | – | AUTH-5 |
| POST `/api/auth/resend-verification` | user | AUTH-5 |
| GET `/api/auth/google/start` | – | AUTH-4 (redirects) |
| GET `/api/auth/google/callback` | – | AUTH-4 (redirects back into the SPA) |
| PATCH `/api/account` · POST `/api/account/password` | user | AUTH-12 |
| GET `/api/test/items` | – | Active item set (text, ordering; no keys) |
| GET `/api/test/session` | guest/user | Current in-progress session + answers |
| POST `/api/test/session` | guest/user | Consent + demographics → start (TEST-1..4) |
| PUT `/api/test/session/answers` | owner | Autosave batch (TEST-5) |
| POST `/api/test/session/abandon` | owner | Start over (TEST-4) |
| POST `/api/test/session/submit` | owner | Score + complete (TEST-8) |
| POST `/api/test/session/review` | owner | Rating (TEST-11) |
| GET `/api/results` | user | My Results list (RES-3) |
| GET `/api/results/:ref` | owner/admin | Full report (RES-1/2); guests receive `401 RESULTS_LOCKED` + teaser |
| POST/DELETE `/api/results/:ref/share` | owner | Enable/disable share link (RES-4) |
| GET `/api/shared/:token` | – | Public shared report (RES-4) |
| POST `/api/challenge/registrations` | – | CH-2..5 |
| GET `/api/challenge/my-registrations` | user | AUTH-12 |
| POST `/api/contact` | – | SITE-1 |
| POST `/api/newsletter/subscribe` · GET `/api/newsletter/unsubscribe?token=` | – | SITE-2 |
| GET `/api/faqs` | – | SITE-3 |
| GET `/api/admin/dashboard` | admin | ADM-1 |
| GET `/api/admin/sessions` · GET `/api/admin/sessions/:ref` | admin | ADM-2 |
| GET `/api/admin/export/{sessions\|registrations\|messages\|subscribers}` | admin | ADM-3 (CSV stream) |
| GET/PATCH `/api/admin/registrations[/:id]` | admin | ADM-4 |
| GET/PATCH `/api/admin/messages[/:id]` | admin | ADM-5 |
| GET/PATCH `/api/admin/users[/:id]` | admin | ADM-6 |
| GET/POST/PATCH/DELETE `/api/admin/faqs[/:id]` · POST `/api/admin/faqs/reorder` | admin | ADM-7 |
| GET/PUT `/api/admin/settings` | admin | ADM-8 |
| GET `/api/admin/items` · GET `/api/admin/norms` | admin | ADM-9 |
| GET `/api/admin/audit` | admin | ADM-10 |

### 6.5 Frontend routes
| Path | Page |
|---|---|
| `/` (`/#challenge` scrolls to the challenge section) | Landing + 60-Day Challenge (STI/TTI) |
| `/test` | Consent → Demographics → Questions → Review → Submitted / Results gate |
| `/results/:ref`, `/r/:token`, `/my-results` | Report, shared report, history |
| `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/account` | Auth and account |
| `/factors`, `/factors/:code`, `/how-it-works`, `/benefits`, `/faq`, `/contact`, `/privacy`, `/terms` | Content pages |
| `/admin`, `/admin/participants[/:ref]`, `/admin/registrations`, `/admin/messages`, `/admin/users`, `/admin/faqs`, `/admin/settings`, `/admin/items`, `/admin/audit` | Admin console (lazy-loaded, admin only) |
| `*` | 404 |

`react-router-dom` is added as a dependency.

---

## 7. Data model (MySQL 8 / MariaDB 10.4 compatible)
All tables use InnoDB and `utf8mb4_unicode_ci`. Timestamps are `DATETIME` in UTC. Primary keys are `BIGINT UNSIGNED AUTO_INCREMENT` unless stated otherwise. JSON-like fields are `TEXT`, validated in PHP, so they work on both database engines.

| Table | Key columns |
|---|---|
| `users` | email (unique), name, password_hash NULL, google_sub (unique NULL), role ENUM(user,admin), status ENUM(active,disabled), email_verified_at, last_login_at, created_at, updated_at |
| `auth_tokens` | user_id, type ENUM(verify_email,reset_password), token_hash CHAR(64) unique, expires_at, used_at |
| `rate_limits` | bucket, key_hash, window_start, hits — PK(bucket,key_hash,window_start) |
| `factors` | code PK, name, low_label, high_label, category, descriptions (short, detailed, low, average, high, workplace), sort_order |
| `domains` | code PK (EX, AX, TM, IN, SC), name, description, sort_order |
| `domain_weights` | domain_code, factor_code, weight TINYINT — PK(domain,factor) |
| `item_sets` | version PK, is_active, created_at |
| `items` | id, item_set_version, item_code (e.g. A1, ATT1), factor_code NULL, keyed ENUM('+','-') NULL, is_attention_check, expected_answer NULL, text, position — unique(set, position) |
| `norm_sets` · `factor_norms` · `factor_percentiles` · `domain_norms` | version; (version, factor, mean, sd, n, alpha); (version, factor, raw_score, percentile); (version, domain, mean, sd) |
| `test_sessions` | public_ref CHAR(9) unique, user_id NULL, guest_token_hash CHAR(64) NULL, status ENUM(in_progress,completed,abandoned,expired), item_set_version, norm_version, current_page, consent_version, consent_at, demographics (country, age, gender, gender_text, nickname, education, occupation), started_at, last_activity_at, completed_at, active_seconds, quality_flagged, quality_details, share_token CHAR(32) unique NULL, ip_hash, user_agent — indexes (user_id,status), (guest_token_hash,status), (status,completed_at) |
| `session_answers` | session_id, item_id, value TINYINT, answered_at — PK(session_id,item_id) |
| `session_page_times` | session_id, page, seconds — PK(session_id,page) |
| `session_factor_scores` | session_id, factor_code, raw_score, z_score, sten, percentile, band — PK(session_id,factor_code) |
| `session_domain_scores` | session_id, domain_code, composite, z_score, sten, band — PK(session_id,domain_code) |
| `session_reviews` | session_id PK, rating, comment, created_at |
| `challenge_registrations` | ref_code unique, program ENUM(STI,TTI), user_id NULL, name, email, phone, age, city, country, cohort_timing ENUM(morning,evening,weekend), struggles (JSON text), primary_goal, consent_at, status ENUM(registered,confirmed,waitlisted,completed,cancelled), admin_notes, ip_hash, created_at, updated_at — index (email,program,status) |
| `contact_messages` | name, email, subject, message, status ENUM(new,handled), handled_by, handled_at, ip_hash, created_at |
| `newsletter_subscribers` | email unique, status ENUM(subscribed,unsubscribed), unsubscribe_token unique, created_at, unsubscribed_at |
| `faqs` | category, question, answer, sort_order, is_published, updated_at |
| `settings` | `key` PK, value, updated_at, updated_by |
| `audit_logs` | actor_user_id NULL, actor_type ENUM(guest,user,admin,system), action, entity_type, entity_id, details, ip_hash, created_at — index (created_at), (action) |
| `email_log` | to_email, template, status ENUM(sent,failed), error, created_at |
| `schema_migrations` | version PK, applied_at |

---

## 8. Delivery plan (approval gate after each phase)

| Phase | Deliverables | Done when |
|---|---|---|
| **0. PRD** | This document | Owner approves |
| **1. Foundation** | Folder layout; PHP core (router, DB, config, errors, logging, validator, CSRF, rate limiter); migrations and seeds (factors, IPIP item set + attention checks, norms, FAQs, settings); `.htaccess` (SPA fallback, `/api` routing, headers, caching); Vite proxy; remove dead code, demo data and unused packages; `/api/health` + `/api/settings/public` working end to end | Fresh database migrates and seeds on XAMPP; health check OK; app builds |
| **2. Auth** | AUTH-1…13; auth pages + AuthContext; Google sign-in (**owner provides OAuth client ID**); SMTP mail (**owner provides SMTP details**); create-admin CLI | All auth test cases pass locally; real emails received; Google sign-in works |
| **3. Assessment & results** | TEST-1…12, RES-1…5; PHP ScoringService + golden tests; new item set in UI; results gate; My Results; share links | Golden tests pass; guest → sign up → report flow works; resume works across devices |
| **4. Challenge & site forms** | CH-1…8, SITE-1…5 | Both programs register correctly with emails; duplicates blocked |
| **5. Admin console** | ADM-1…12 | Every admin page works on real data; exports open correctly in Excel |
| **6. UI polish** | Design system pass across all pages, routing/SEO (SITE-6), accessibility, responsive QA | Owner UI review approved |
| **7. Production & deploy** | Performance tuning, security header check, backups, cron, `docs/DEPLOY.md`, deploy to DreamHost, smoke test on the live domain | Live site passes the acceptance checklist (Appendix C) |

---

## 9. Owner decisions (resolved 2026-10-03)

| # | Question | Decision |
|---|---|---|
| O-1 | Must users verify their email before seeing results? | **No.** Verification is encouraged with a banner but doesn't block. |
| O-2 | Minimum age | **18+** (default and minimum for the `min_age` setting). This avoids parental-consent duties under India's DPDP Act. |
| O-3 | Data retention vs. erasure laws | Keep all responses for research. There is no self-service deletion. If someone emails a request, an admin **anonymises** the account (personal details removed, answers kept). The Privacy Policy states this. This adds requirement **ADM-11**: an admin "Anonymise user" action, which is audited. |
| O-4 | Domain name and support email | Pending. The owner will provide them before Phase 2. |
| O-5 | Admin two-factor authentication | **Yes.** Authenticator-app (TOTP) codes for admin accounts, delivered in Phase 5 as requirement **ADM-12**. |

---

## Appendix A — Prototype features retained (now backed by the server)
Landing page sections; 16 factor flip cards and factor directory; how-it-works and benefits pages; FAQ with search; consent → demographics → paged circle-scale test with keyboard shortcuts, autosave indicator, offline banner and review map; thank-you screen with reference code and star rating; results report (domains, bipolar bars, filters, top traits, recommendations, print); 60-Day Challenge cards and registration; contact form; newsletter; cookie notice; announcement bar; maintenance page; admin dashboard, participants, registrations, item set, settings, audit log, CSV exports.

## Appendix B — Prototype faults → requirement
| Fault | Fixed by |
|---|---|
| 1 Passwords never checked | AUTH-1, AUTH-3 |
| 2 Anyone can become admin; any admin login accepted | AUTH-10; demo buttons removed |
| 3 Fake Google login | AUTH-4 |
| 4 Results fallback showed another person's results | RES-1 |
| 5 Sign-up with an existing email signs into that account | AUTH-2 |
| 6 Forgot password does nothing | AUTH-6 |
| 7 Global domains ignore the sign of each factor | §3.3 signed composite + domain norms |
| 8 Submission allowed with 10/163 answers | §3.3 completeness rule, TEST-8 |
| 9 Invented norms | §3.2 empirical norms (N = 35,338) + IPIP items |
| 10 Admin items-per-page / min-age settings ignored | TEST-2, ADM-8 |
| 11 Campaign links not validated | Campaigns removed |
| 12 Resume only for signed-in users | TEST-4, TEST-6 |
| 13 "Start fresh" deletes data; page time hard-coded | TEST-4, TEST-5 |
| 14 Terms link exits the consent step; footer Terms opens Privacy | TEST-1, SITE-6 |
| 15 STI registrations invisible to admin | CH-7, ADM-4 |
| 16 Wrong program details saved | CH-2 |
| 17 Auto-"confirmed"; duplicates; no email | CH-4, CH-5, CH-6 |
| 18 Data with no admin UI | ADM-1…10; researcher/deletion features removed |
| 19 Newsletter not saved; maintenance only local | SITE-2, SITE-5 |
| 20 Auth state doesn't refresh the UI | AUTH-9 (AuthContext) |
| 21 No real URLs | SITE-6 |
| 22 Demo data mixed with real data | Phase 1 removal |
| 23 "5-x" label; 50 % chip; inconsistent top-trait thresholds | ADM-9, RES-2, Phase 6 |

## Appendix C — Acceptance checklist (run at the end of each phase where relevant, and on the live site)
1. A guest takes the full test, closes the tab, reopens it and resumes on the same page with the answers kept.
2. The guest submits and sees the results gate; signs up; lands on their report; the report also appears in My Results.
3. A signed-in user starts on a laptop and resumes on a phone.
4. Submitting with any item unanswered is rejected by the API, even if the UI is bypassed.
5. Scores for golden vectors match the Python reference exactly.
6. User A cannot open user B's `/results/:ref` (404, see RES-1), and a guest cannot read any report (401).
7. A wrong password is rejected; the 6th failed attempt within 15 minutes is rate-limited.
8. The forgot-password email arrives; its link works once only and expires after 60 minutes.
9. Google sign-in creates an account, signs in, and links to an existing account with the same verified email.
10. A non-admin calling any `/api/admin/*` endpoint gets 403; a request without the CSRF header gets 403.
11. STI and TTI registrations both show "Registered successfully", send an email and appear in admin with the correct fields; a duplicate is detected.
12. Maintenance mode blocks the public site (503 page) while admins keep working.
13. A CSV export opens in Excel without formula execution and includes all participants (paged on the server, streamed).
14. Lighthouse on the landing page: Performance ≥ 85 (mobile), Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
15. The security headers check (securityheaders.com) gets an A.

## Appendix D — References
- IPIP–16PF scale table: https://ipip.ori.org/new16PFTable.htm · scoring key: https://ipip.ori.org/new16PFKey.htm
- Open Psychometrics raw data (16PF): https://openpsychometrics.org/_rawdata/
- Sten scores: https://en.wikipedia.org/wiki/Sten_scores
- Google OAuth 2.0 for web server apps: https://developers.google.com/identity/protocols/oauth2/web-server
