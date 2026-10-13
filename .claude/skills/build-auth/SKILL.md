---
name: build-auth
description: Build, change, test or debug authentication and account security for the Transenigma site (plain PHP 8.2 + MySQL backend, React frontend) — sign-up/sign-in, sessions, CSRF, email verification, password reset, Google sign-in, roles, disabled accounts, admin 2FA (TOTP), anonymise user, audit logging. Use for any work touching AuthService, GoogleOAuth, Session, Csrf, TokenService, PasswordPolicy, UserRepository, the auth/account pages, or PRD requirements AUTH-*, ADM-11, ADM-12.
argument-hint: <auth feature, change or bug>
---
Work on the following auth task:

$ARGUMENTS

## Ground rules (never skip)
- **No auth library.** The server is DreamHost shared hosting: PHP 8.2 + MySQL only, with no Node and no Composer. Better Auth, NextAuth, Passport and similar JS libraries cannot run there. Everything is hand-written PHP in `api/src/`. Third-party PHP is vendored in `api/lib/` only with the owner's approval.
- Present the plan (requirement IDs, files, tests, any DB change) and get the owner's approval **before** building. Never commit or push without their OK.
- **Secrets** (`google.client_*`, `mail.*`, `app.secret`, DB password) live only in git-ignored `api/config/config.local.php`.
  - Never ask for them in chat, and never read, print or `require` that file from a script.
  - To check whether something is configured, use behaviour: `GET /api/auth/me` returns `googleEnabled`.
- **Databases:** use only `transenigma` (app) and `transenigma_test` (tests). Never touch `wellness*`. Never touch the owner's admin, user id 1.
- **Migrations:** never edit an applied one. A schema change is a new `database/migrations/NNN_*.sql`.
- **Spec:** `docs/PRD.md` §4.1 (AUTH-1…13), ADM-11 (anonymise) and ADM-12 (admin TOTP) are the specification. A deviation is clarified with the owner and logged in the PRD.

## Where things live
| Concern | File |
|---|---|
| Routes and guards (`auth` `null/'user'/'admin'`, `csrf`, `maintenance`) | `api/routes.php`, `api/src/Core/Kernel.php` (guards in order: maintenance → CSRF → auth) |
| Sign-up, sign-in, sign-out, verify, reset, change password, `/auth/me` payload | `api/src/Services/AuthService.php` |
| Google OAuth (state + PKCE, ID-token claim checks, link/create) | `api/src/Services/GoogleOAuth.php`, `api/src/Controllers/GoogleAuthController.php` (browser redirects, not JSON) |
| Session cookie `te_sid` (HttpOnly, SameSite=Lax, sliding renewal, file purge) | `api/src/Core/Session.php` |
| CSRF token + Origin check | `api/src/Core/Csrf.php` |
| Emailed single-use tokens (SHA-256 hashed) | `api/src/Services/TokenService.php` |
| Password rules + Argon2id | `api/src/Services/PasswordPolicy.php` |
| Rate limits (MySQL, HMAC-hashed keys) | `api/src/Core/RateLimiter.php` (`hit`, `tooMany`, `clear`) |
| Audit log | `api/src/Services/AuditService.php` (`log`, `forUser`) |
| User rows | `api/src/Repositories/UserRepository.php` (`toPublic` is the only shape sent to the browser) |
| Emails | `api/src/Services/Mailer.php` + `api/templates/email/*.php` (layout `_layout.php`) |
| Frontend | `src/api/auth.ts`, `src/context/AuthContext.tsx`, `src/pages/auth/*`, `src/pages/AccountPage.tsx`, `src/components/auth/` (`AuthShell`, `FormControls`) |
| Tests | `api/tests/AuthTest.php`, `AuthorizationTest.php`; helpers in `_helpers.php` (`authReq`, `freshSession`, `captureMail`, `tokenFromMail`, `uniqueEmail`, `GOOD_PASSWORD`) |

## Security invariants (a change must keep every one)
1. **No account enumeration.**
   - Failed sign-in always returns `INVALID_CREDENTIALS` "Incorrect email or password.", with equal timing (`dummyHash`).
   - Forgot-password always "succeeds".
   - A duplicate sign-up returns `EMAIL_TAKEN` and **never** signs anyone in.
2. **Sessions:**
   - `Session::regenerate()` plus a CSRF rotation (`forget('_csrf')`) on every sign-in; this is the `AuthService::signIn()` path.
   - Every sign-in goes through `AuthService::signIn()`, so guest tests are claimed and the login is audited.
3. **Session invalidation:**
   - `users.session_version` must match the session. A password reset or change bumps it, which signs out other devices.
   - `changePassword` keeps the current session.
   - Disabled users (`status !== 'active'`) are rejected on their next request, not only at sign-in.
4. **Admin idle timeout:** 12 h (`session.admin_idle_minutes`). Roles are only `user` and `admin`. No email pattern ever grants a role. Admins can't demote or disable themselves.
5. **Tokens:**
   - 256-bit random; only the SHA-256 hash is stored; single use with an atomic `consume`.
   - Verify links last 48 h, reset links 60 min.
   - Validate input before consuming a token, so a weak password doesn't burn the link.
   - Verifying an email **never signs anyone in** (owner decision), and only works for the **signed-in account the link was sent for** (`SIGN_IN_TO_VERIFY` / `WRONG_ACCOUNT`); check with `TokenService::peek` before `consume`, so a refused click keeps the link.
   - Credential writes are conditional: `rehashPassword` only replaces the hash it verified; `changePassword` writes only if `session_version` is unchanged and then uses the version its own write created.
6. **CSRF:**
   - Every non-GET route has `csrf` on, unless there is a written reason.
   - The `Origin` header, when sent, must equal `app.url` or `app.allowed_origins`.
   - GET routes never change state. Google `/start` and `/callback` are the exception: they are protected by OAuth `state`.
7. **Google:**
   - Match by `google_sub`, then by email. Create a new account only when `signup_open`.
   - Match by email **only when Google hosts the address** (`emailAuthoritative`: Gmail, or `hd` = the email's domain), and **never replace** an existing `google_sub`. New accounts on other addresses start unverified.
   - Linking drops an unproven password, to stop account pre-hijacking.
   - Check `iss`, `aud`, `exp`, `sub` and `email_verified`.
   - `next` passes through `safeNext()`, same-site paths only.
   - Errors redirect to `/login?error=<code>`, never to a JSON page.
8. **Rate limit** every endpoint that sends email or checks a secret. Audit every security event (`AUTH_*`, `ACCOUNT_*`, role and status changes, lockouts).
9. **Non-owners get 404, not 403.** The API never returns `password_hash`, `google_sub`, `totp_secret`, tokens or raw IPs.
10. **Passwords:** Argon2id via `PasswordPolicy::hash`. Rehash on sign-in when `needsRehash`.

## Process
1. **Read the requirement** (AUTH-* / ADM-*) and the current code above. List what exists, what is half-done and what is missing.
2. **Plan:** endpoints and route options, service methods, migration, emails, UI, audit actions, and the invariants affected. Get the owner's OK.
3. **Build in layers:** migration → Repository → Service → Controller + route → `src/api/auth.ts` → page/context.
   - Throw `HttpException` with a stable `UPPER_SNAKE` code and a friendly message.
   - Use `HttpException::validation([...])` for field errors.
   - For UI, follow the `build-ui` skill; auth pages use `AuthShell` and `FormControls`.
4. **Test.** Add `test('...', fn)` cases in `api/tests/AuthTest.php` for the happy path, every refusal and every invariant touched. Use `captureMail()` instead of real email. Test addresses use `@example.com`: `Mailer` never sends reserved test domains over SMTP.
   - In a test name, escape apostrophes in single-quoted PHP strings (`user\'s`).
   - Google is tested by setting `GoogleOAuth::$tokenExchanger` to return a fake `id_token`.
5. **Verify:**
   - `C:\xampp\php\php.exe api\tests\run.php` (all pass), `npm run lint`, `npm run build`.
   - Then a real browser run on `http://localhost:3000` with the CDP helper `tests/e2e/cdp.mjs`.
   - curl flow: `GET /api/auth/me` returns `csrfToken`, then POST with `X-CSRF-Token` and no `Origin` header.
6. **Clean up** test users and their rows: `auth_tokens`, `audit_logs`, `email_log`, sessions, registrations. Keep user id 1. Report what was deleted.
7. **Record:**
   - append a section to `notes/BUILD-JOURNAL.md`;
   - update `docs/PROGRESS.md` at the end of the phase;
   - remind the owner of the open items (company address/CIN/phone, support-mail recheck, DreamHost webmail check).

## Planned auth work still to build
- **ADM-12 admin TOTP:**
  - RFC 6238 (SHA-1, 6 digits, 30 s, ±1 step), written in plain PHP, with no library.
  - The secret is encrypted with `app.secret` (`openssl_encrypt`, AES-256-GCM).
  - 10 one-time recovery codes, stored hashed.
  - Sign-in becomes a two-step flow: a password or Google session is "pending 2FA" until the code passes.
  - Rate-limit code attempts. Audit enrol, use and reset.
- **ADM-11 anonymise:**
  - Clear name, email, nickname and contact details on the user, their sessions and their registrations; keep answers and scores.
  - Bump `session_version` and set status to disabled.
  - Confirm first; it can't be undone; audit it.
- **AUTH-10/11 admin actions:** change role and disable/enable, with self-protection and auditing.
