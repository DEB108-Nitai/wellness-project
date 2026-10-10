# Local development (Windows + XAMPP)

## Prerequisites
- XAMPP with Apache and MySQL/MariaDB running (PHP 8.2+)
- Node.js 20+ (only used to build the frontend; the server never runs Node)

## First-time setup
1. Create the databases and a dedicated user (MySQL `root` has no password on a default XAMPP):
   ```sql
   CREATE DATABASE transenigma      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE DATABASE transenigma_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'transenigma_app'@'localhost' IDENTIFIED BY '<password>';
   GRANT ALL PRIVILEGES ON transenigma.*      TO 'transenigma_app'@'localhost';
   GRANT ALL PRIVILEGES ON transenigma_test.* TO 'transenigma_app'@'localhost';
   ```
2. Copy `api/config/config.example.php` to `api/config/config.local.php`. Set `db.pass`, and set `app.secret` to the output of
   `php -r "echo bin2hex(random_bytes(32));"`.
3. Create the tables and reference data:
   ```
   C:\xampp\php\php.exe api\bin\migrate.php
   ```
4. Install the frontend packages: `npm install`
5. Create your administrator account. You will be asked to type the password twice:
   ```
   C:\xampp\php\php.exe api\bin\create-admin.php you@example.com "Your Name"
   ```
   Running it for an email that already has an account promotes that account to admin.

## Email and Google sign-in
- **Email:** while `mail.host` in the config is empty, emails are not sent. Each one is saved as an HTML file in
  `api/storage/mail/`, so you can open verification and reset links from there. Fill in the `mail` section to send through SMTP.
- **Google:** sign-in stays hidden until `google.client_id` and `google.client_secret` are set. The authorised redirect URI to
  register in Google Cloud is `<app.url>/api/auth/google/callback` (locally: `http://localhost:3000/api/auth/google/callback`).

## Daily commands
| Task | Command |
|---|---|
| Frontend dev server (http://localhost:3000; `/api` is proxied to XAMPP) | `npm run dev` |
| API directly through Apache | http://localhost/transenigma/api/health |
| Apply new migrations | `C:\xampp\php\php.exe api\bin\migrate.php` |
| Migration status | `C:\xampp\php\php.exe api\bin\migrate.php --status` |
| Rebuild the local DB from scratch | `C:\xampp\php\php.exe api\bin\migrate.php --fresh` |
| API tests (uses `transenigma_test`, wiped each run) | `C:\xampp\php\php.exe api\tests\run.php` |
| Daily housekeeping (expire stale tests, purge old tokens) | `C:\xampp\php\php.exe api\bin\cron-daily.php` |
| Type-check the frontend | `npm run lint` |
| Browser end-to-end tests (dev server must be running) | see `tests/e2e/README.md` |
| Production build (outputs `dist/`, including `.htaccess`) | `npm run build` |

If XAMPP serves the project from a different URL, set `TRANSENIGMA_API_TARGET` (for example in `.env.local`) to that URL without the `/api` suffix.

## Regenerating psychometric reference data
`database/migrations/002_reference_data.sql` is generated. Do not edit it by hand.
1. Download https://openpsychometrics.org/_rawdata/16PF.zip and unzip it.
2. Build the item list and norms:
   `python docs/scoring/derive_norms.py <data.csv> <items.txt> docs/scoring`
   (`items.txt` contains `CODE<TAB>text` lines; see `docs/scoring/ipip16_items.tsv`.)
3. Rebuild the SQL: `php database/tools/build-seeds.php`, then regenerate the scoring test cases with
   `python docs/scoring/reference_scoring.py golden <data.csv>`.
4. Put the new data in a **new** migration with a new item-set or norm-set version. Never change one that has already been applied.

## Layout
- `api/` is the PHP backend. `index.php` is the only file reachable over HTTP; `routes.php` holds the route table.
- `api/src/Core` contains the framework pieces: config, database, router, request/response, validation, sessions, CSRF protection, rate limiting and logging.
- `database/migrations` holds the versioned SQL files. `database/tools` holds the seed generator.
- `docs/PRD.md` is the plan of record. `docs/PROGRESS.md` is the status and handover document (start here). `docs/scoring/` contains the item key and norms.
