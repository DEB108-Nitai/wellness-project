# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Start here
- `docs/PROGRESS.md` is the handover document: phase status, fault table, pending work, owner decisions, items waiting on the owner. Read it before starting work and update it at the end of each phase.
- `docs/PRD.md` is the plan of record (requirements IDs like AUTH-*, TEST-*, RES-*, CH-*, ADM-*). Follow it; clarify deviations with the owner.
- Working rule: present the plan for each phase/step and get the owner's approval **before** building. Never commit without their OK.

## Hard constraints
- Production host is DreamHost shared hosting: **PHP 8.2 + MySQL only. Node never runs on the server.** Node is used only to build the frontend (`dist/`) and for local E2E scripts.
- No Composer. Third-party PHP code is vendored in `api/lib/` (PHPMailer) and loaded by `api/bootstrap.php`.
- One domain serves both the SPA and `/api`.
- Do not touch the `wellness` / `wellness_test` databases — they belong to a different project (`htdocs/wellness-project`). This project uses `wellness16pf` and `wellness16pf_test`.
- Secrets (DB password, `app.secret`, SMTP, Google OAuth) live only in git-ignored `api/config/config.local.php` (template: `config.example.php`). Never ask for them in chat.

## Commands
PHP is XAMPP's: `C:\xampp\php\php.exe` (also `php` if on PATH).

| Task | Command |
|---|---|
| Frontend dev server (http://localhost:3000, proxies `/api` to XAMPP Apache) | `npm run dev` |
| Type-check (the only "lint") | `npm run lint` |
| Production build | `npm run build` |
| All API tests (wipes and re-migrates `wellness16pf_test`) | `php api/tests/run.php` |
| Single API test file (substring match on filename) | `php api/tests/run.php Scoring` |
| Apply migrations / status / rebuild from scratch | `php api/bin/migrate.php` / `--status` / `--fresh` |
| Create or promote an admin | `php api/bin/create-admin.php you@example.com "Name"` |
| Daily housekeeping | `php api/bin/cron-daily.php` |
| Browser E2E (needs XAMPP + `npm run dev` + Chrome) | `node tests/e2e/guest-flow.mjs`, `node tests/e2e/phase4-flow.mjs <adminEmail> <pw>` |

E2E scripts create real rows in `wellness16pf` (`@example.com` accounts) — clean them up afterwards (see `docs/PROGRESS.md`). If Apache serves the project elsewhere, set `WELLNESS_API_TARGET` in `.env.local`. Full setup: `docs/DEVELOPMENT.md`.

## Architecture

### Backend (`api/`)
- `index.php` is the only HTTP-reachable file (`.htaccess` denies everything else). It loads `bootstrap.php` (PSR-4-style autoload for `Wellness\` → `api/src/`) and dispatches via `Core\Kernel`.
- `routes.php` is the route table. Each route carries options: `auth` (`null|'user'|'admin'`), `maintenance` (blocked in maintenance mode, default true), `csrf` (default true on non-GET). Router supports `{param:regex}` placeholders.
- Kernel runs guards in order: maintenance → CSRF (`X-CSRF-Token` header + Origin check) → auth. Errors are thrown as `Core\HttpException` and rendered as the JSON envelope `{ok:true,data}` / `{ok:false,error:{code,message,fields}}`.
- Layering: `Controllers` (validate input with `Core\Validator`, shape responses) → `Services` (business logic) → `Repositories` / PDO via `Core\Database`.
- Sessions: HttpOnly `wl_sid` cookie, SameSite=Lax; `users.session_version` invalidates sessions on password change. Guests own assessment sessions via a hashed HttpOnly `wl_guest` cookie; these are claimed into the account at sign-in.
- Rate limiting is stored in MySQL; IPs are stored only as HMAC hashes. Security-relevant actions go through `AuditService`.
- Email: `Services\Mailer` + templates in `api/templates/email/`. When `mail.host` is empty, emails are written to `api/storage/mail/` (open verification/reset links from there).
- Non-owners of a resource get 404, not 403. Guest results are locked (401 `RESULTS_LOCKED`) until sign-up.

### Scoring (16PF)
- 163 IPIP items + 3 attention checks. Norms derived from Open Psychometrics data; source of truth is `docs/scoring/` (`norms.json`, `ipip16_items.tsv`, `reference_scoring.py`, `golden.json`).
- raw → z → sten = clamp(round(2z + 5.5)) with half-away-from-zero rounding; bands low 1–3 / average 4–7 / high 8–10. Global domains are signed factor composites normed separately (`ScoringService`).
- `ScoringTest` checks the PHP engine against golden cases from the independent Python reference — keep them in agreement.

### Database (`database/`)
- Versioned SQL migrations in `database/migrations/NNN_*.sql`, applied by `api/src/Migrations/Migrator.php`. Never edit an applied migration; add a new one.
- `002_reference_data.sql` is **generated** by `php database/tools/build-seeds.php` from `docs/scoring/` and `database/tools/factors_content.json`. New item/norm data goes in a new migration with a new version.

### Frontend (`src/`, React 19 + Vite + Tailwind 4 + react-router 7)
- `src/api/client.ts` is the fetch wrapper: unwraps the envelope, fetches/attaches the CSRF token automatically. Per-domain modules (`auth.ts`, `assessment.ts`, `challenge.ts`, `site.ts`, `admin.ts`) define typed calls.
- Global state: `context/AuthContext`, `ActiveSessionContext` (in-progress test), `SettingsContext` (public site settings, maintenance). `hooks/useAutosave.ts` batches answers with an offline queue.
- Pages in `src/pages/` (auth, test, results, account); route paths in `src/lib/routes.ts`. The home page sections and admin portal live in `src/components/views/`; admin panels in `src/components/admin/`.
- 60-Day Challenges: three programs in fixed order STI (Program 01), PTI (02), TTI (03), defined in `src/api/challenge.ts` (`PROGRAMS`) and the DB enum `challenge_registrations.program`. All three share the TTI layout; program copy is owner-approved — don't rewrite it. After registration the UI shows only "Registered successfully".
- Roles are `user` and `admin` only.
