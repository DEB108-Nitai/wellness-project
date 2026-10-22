# Deploying Transenigma to DreamHost

This guide takes the site from this repository to **https://transenigma.com** on DreamHost shared hosting (PHP 8.2 or newer + MySQL; the live site runs PHP 8.3 and MySQL 8.4). The server never runs Node: the React app is built on a developer machine and uploaded as static files, next to the PHP API.

> **Secrets** (database password, `app.secret`, SMTP password, Google client secret) go **only** into the server's `config.php`. Never put them in chat, email or git.

---

## 0. Before you start (owner / company)

| Item | Where | Notes |
|---|---|---|
| DreamHost panel access | panel.dreamhost.com | Account that hosts (or will host) transenigma.com |
| Domain → DreamHost | Panel → Websites | If transenigma.com is hosted elsewhere today, its DNS must point to DreamHost. **Back up the old site first** (§2). |
| PHP version | Panel → Websites → Manage → PHP | **PHP 8.2** (or newer 8.x) |
| HTTPS | Panel → Websites → Secure Certificate | Free Let's Encrypt certificate |
| SSH user | Panel → Websites → Manage → SFTP/SSH user | Shell type: **SSH**. The site's files belong to this user. |
| MySQL database | Panel → MySQL Databases | Database `transenigma`, user `transenigma_app`, hostname e.g. `mysql.transenigma.com`. A test database is not needed on the server. |
| Email for sending | Panel → Email (or the company's mail provider) | A mailbox such as `support@transenigma.com`, with its **SMTP host, port and password** |
| Google sign-in (optional) | console.cloud.google.com → Credentials | OAuth client; authorised redirect URI **`https://transenigma.com/api/auth/google/callback`** |

### How the live site is set up (since 2026-10-19)

No passwords here: they are only in the server's `config.php` and `~/.my.cnf`, and with the people who own the accounts.

| What | Value |
|---|---|
| SSH / SFTP | the site's SSH user (Panel → Websites → SFTP/SSH users); connect with `ssh <user>@transenigma.com` |
| Web root | `~/transenigma.com` |
| Config (secrets) | `~/transenigma-config/config.php` (mode 600, outside the web root) |
| PHP | 8.3, `/usr/local/php83/bin/php` |
| Database | MySQL 8.4 on `mysql.transenigma.com`; its name and user are in `config.php` and Panel → MySQL Databases |
| Mail | `support@transenigma.com` through `smtp.dreamhost.com` |
| DNS | at DreamHost. SPF and DKIM by DreamHost; DMARC TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:support@transenigma.com` |
| HTTPS | Let's Encrypt, renewed automatically by DreamHost |
| Backups | `~/backups` (database and `uploads/`, 14 days); site copies before each update: `~/site-before-update-*.tar.gz` |
| Server scripts | `~/update-site.sh`, `~/bin/backup-db.sh` (copies of [`deploy/`](../deploy/)) |
| Old site (before 2026-10-19) | `~/transenigma.com-old-2026-10-19` and `~/old-site-backup-2026-10-19.tar.gz`: can be deleted once nobody needs it |
| Search Console | transenigma.com verified (meta tag in `index.html`), sitemap submitted |

---

## 1. Build and check locally

```
npm ci
npm run lint
php api/tests/run.php                      # all tests must pass (WIPES the db_test database: keep it disposable)
npm run build                              # creates dist/
node tests/e2e/redirects.mjs               # old-URL redirects against XAMPP + dist/
```

`dist/` now contains: `index.html`, `assets/`, `brand/`, `images/`, `.htaccess`, `robots.txt`, `sitemap.xml`.

---

## 2. Back up the old site

Before anything is replaced:
1. Download the current site folder over SFTP, or ask the current host for an archive.
2. Export its database, if it has one.
3. Keep both safe until the new site has run without problems for a few weeks.

---

## 3. Folder layout on the server

DreamHost serves the domain from `/home/<user>/transenigma.com/`. The config file lives **one level above** it, where the web can't reach it.

```
/home/<user>/
├── transenigma-config/
│   └── config.php              ← secrets (from api/config/config.example.php)
└── transenigma.com/            ← web root
    ├── index.html              ┐
    ├── .htaccess               │
    ├── robots.txt, sitemap.xml │  contents of dist/
    ├── assets/  brand/  images/┘
    ├── api/                    ← the api/ folder (see below)
    ├── uploads/                ← images admins upload (created on first upload, mode 755). LIVE CONTENT:
    │                              never delete or overwrite it when deploying; it is backed up nightly (§6)
    └── database/
        └── migrations/         ← database/migrations/ (read by migrate.php; blocked from the web by .htaccess)
```

**Upload `api/` without:**
- `api/tests/`
- `api/config/config.local.php`
- anything inside `api/storage/logs`, `sessions`, `cache` and `mail`. Keep the empty folders and their `.gitkeep` files.

**Do not upload:** `src/`, `node_modules/`, `docs/`, `tests/`, `notes/`, `.env*`, `package*.json`.

Upload with SFTP (FileZilla, WinSCP) or `scp`/`rsync` over SSH.

---

## 4. Server config

Over SSH:
```
mkdir -p ~/transenigma-config
cp ~/transenigma.com/api/config/config.example.php ~/transenigma-config/config.php
chmod 600 ~/transenigma-config/config.php
nano ~/transenigma-config/config.php
```
Set:
| Key | Production value |
|---|---|
| `app.env` | `'production'` |
| `app.debug` | **`false`** |
| `app.url` | `'https://transenigma.com'` |
| `app.secret` | a new 64-hex secret: `php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"` |
| `db.host / name / user / pass` | from the DreamHost MySQL panel |
| `mail.*` | SMTP host, port (587 + `tls`, or 465 + `ssl`), username, password; `from_email` `support@transenigma.com`, `from_name` `Transenigma` |
| `google.client_id / client_secret` | if Google sign-in is used; otherwise leave empty (the button is hidden) |

The API finds this file automatically (`Core\Config`: `../../transenigma-config/config.php` relative to `api/`).

**Then run the preflight check** (it never prints a secret, only whether each setting looks right):
```
cd ~/transenigma.com
/usr/local/php83/bin/php api/bin/preflight.php
```
It checks the PHP version and extensions (pdo_mysql, openssl with AES-256-GCM, mbstring, fileinfo, curl), the production settings (`env`, `debug` off, https `url`, a 64-hex `app.secret`, SMTP), the database connection and clocks, pending migrations, the admins, writable folders, `index.html` and both `.htaccess` files, and that the config file is outside the web root. Fix every **FAIL** line before going live. On this first run, the `migrations` line fails (nothing is applied yet) and the admins line is skipped; step 5 fixes both. Run it again after step 5: it should end with `READY`.

---

## 5. Database and admin account

The live site runs PHP 8.3; its command-line binary is `/usr/local/php83/bin/php` (for PHP 8.2 it would be `/usr/local/php82/bin/php`).
```
cd ~/transenigma.com
/usr/local/php83/bin/php api/bin/migrate.php            # creates every table and the content (001…030)
/usr/local/php83/bin/php api/bin/migrate.php --status   # all applied
/usr/local/php83/bin/php api/bin/create-admin.php you@transenigma.com "Your Name"
```
`create-admin` asks for the password twice, and checks it against the password policy. The password is **visible while you type**, so make sure nobody is watching the screen. It is stored only as an Argon2id hash.

**The primary admin:** the first admin created on the server is the primary admin, the only one who can add or remove admins in the console (Admins page). To name another one from the server (for example if the primary admin has left): `/usr/local/php83/bin/php api/bin/create-admin.php --primary admin@transenigma.com`.

**Two-step sign-in (every admin):**
- At the first sign-in on the live site, the admin scans a QR code with an authenticator app (Google Authenticator, Microsoft Authenticator…) and saves **10 recovery codes**. After that, every admin sign-in needs a code from the app.
- The app secret is encrypted with `app.secret`. Setting a new `app.secret` makes saved app secrets unreadable: admins then sign in with a recovery code and use **Security → Move to a new phone**, or are reset as below. So set the final `app.secret` **before** the admins set up their phones.
- **Lost phone and recovery codes:** reset from the server, and the admin sets it up again at their next sign-in:
  ```
  /usr/local/php83/bin/php api/bin/create-admin.php --reset-2fa admin@transenigma.com
  ```

---

## 6. Cron jobs (Panel → Advanced → Cron Jobs)

| Job | Schedule | Command |
|---|---|---|
| Housekeeping | daily | `/usr/local/php83/bin/php /home/<user>/transenigma.com/api/bin/cron-daily.php` |
| Database + uploads backup (14 days kept) | daily | `bash $HOME/bin/backup-db.sh` |
| Newsletter sender | **every 10 minutes** | `/usr/local/php83/bin/php /home/<user>/transenigma.com/api/bin/send-newsletters.php` |

Set "Email output to" on each job to an address someone reads. The newsletter sender prints nothing when the queue is empty, so it only emails when it actually sent a batch. Without that job, a newsletter sent from the admin stays at "0 delivered".

**The newsletter sender** sends at most `mail.newsletter_per_hour` emails an hour (default 80; set it in `config.php` under `mail`). DreamHost limits each mailbox to about 100 messages an hour, and sign-up, reset and contact emails use the same mailbox, so keep the setting below the limit. A failed address is retried once an hour, three times at most.

**The backup** is set up once with [`deploy/setup-backup.sh`](../deploy/setup-backup.sh) (upload it, run `bash setup-backup.sh`). It writes:
- `~/.my.cnf` (mode 600) with the database login read from `config.php`, so no password is in a cron line or a script;
- `~/bin/backup-db.sh`, which runs `mysqldump --single-transaction --no-tablespaces` (DreamHost needs `--no-tablespaces`), checks the archive and that the dump finished, and only then deletes backups older than 14 days. It also archives `uploads/` (the images admins upload are live content);
- and runs it once, so you see the first `.sql.gz` in `~/backups`.

- **Before relying on it:** test a restore into a scratch database (§9).
- **Keep `~/setup-backup.sh` on the server:** run it again whenever the database password or name changes, since it writes them into `~/.my.cnf` and the backup script.
- Where every backup is, downloading them monthly, and restoring step by step: [BACKUPS.md](BACKUPS.md).
- **If a run fails:** cron emails the error, and the existing backups are kept.

---

## 7. Go-live checklist (on https://transenigma.com)

**Automatic** (from a developer machine; creates no data):
```
node tests/e2e/redirects.mjs https://transenigma.com
curl -s https://transenigma.com/api/health
curl -sI https://transenigma.com/ | grep -iE "strict-transport|x-frame|content-security"
```

**Before launch (secrets and email):**
- [ ] Fresh secrets on the server only: a new `app.secret` (`php -r "echo bin2hex(random_bytes(32));"`), the company's Google OAuth client and secret (delete the old personal-project client afterwards), and a **new password for the support@ mailbox** (DreamHost panel → Email). The local development copies may have been reachable on the LAN while `npm run dev` ran, so none are reused.
- [ ] Email authentication for transenigma.com: SPF and DKIM records exist (DreamHost panel → Mail → or the DNS provider), plus a DMARC record (§0). Then send one **password reset to a Gmail address** and confirm it lands in the inbox, not Spam.

**By hand:**
- [ ] `http://` and `www.` addresses end up on `https://transenigma.com` (the redirect check above covers `www`).
- [ ] Every menu page loads: Home, Programs, 16PF Test pages, Research, Consultancy, Our Team, Contact, Privacy, Terms.
- [ ] Refreshing a deep page (e.g. `/research#drug-discovery`) works, with no 404.
- [ ] Take the test as a guest → submit → sign up → **verification email arrives** → report opens.
- [ ] Forgot password → **reset email arrives** → new password works.
- [ ] Google sign-in (if configured).
- [ ] 60-day program registration → "Registered successfully" → **confirmation email arrives**.
- [ ] Contact form → **notification arrives at support@transenigma.com**.
- [ ] Newsletter subscribe/unsubscribe. Admin → Newsletter: write one, **Send me a test**, and check it arrives in the inbox. Admin → Messages: reply to a message (the Subject box is pre-filled) and check it arrives.
- [ ] Admin: sign in → set up two-step sign-in on your phone → save the recovery codes → Registrations and Settings work. Sign out and in again: the code is asked for. A normal account is refused.
- [ ] Phone check: menu drawer, research cards swipe, no sideways scrolling.
- [ ] `https://transenigma.com/robots.txt` and `/sitemap.xml` load. Submit the sitemap in Google Search Console.
- [ ] `https://transenigma.com/api/config/config.example.php` and `/database/migrations/` return **403**.
- [ ] **10-minute sign-in check** with a fresh Gmail address: sign up → verification email → click it (signed in) → sign out → sign in → forgot password → reset → sign in with the new password → Google sign-in → open `/admin` as that normal user and confirm it is refused.
- [ ] Delete any test accounts created during these checks.

---

## 8. Updating the site later

Scripted since the launch. On a developer machine, with the change merged into `main`:
```
git checkout main && git pull
npm ci
npm run lint
php api/tests/run.php                       # all must pass
bash deploy/build-package.sh                # → build/transenigma-update.tar.gz (refuses uncommitted changes)
scp build/transenigma-update.tar.gz <user>@transenigma.com:~/
ssh <user>@transenigma.com "bash ~/update-site.sh"
```
`~/update-site.sh` on the server is a copy of [`deploy/update-site.sh`](../deploy/update-site.sh); upload it again if it changes. It prints each step and ends with **`DONE. The update is live.`** In order:
1. **Backups:** database and `uploads/` (`~/bin/backup-db.sh`), and the whole site folder (`~/site-before-update-<time>.tar.gz`).
2. Unpacks the package into a staging folder and sets file permissions.
3. **Maintenance mode on.** Visitors can't submit a test while the database and the code don't match yet: for example, a migration that switches the active norm set (027) would otherwise let the old code score a test with the new set's label, and that result would be stored for good. Admins are let through, so don't take a test yourself during an update.
4. **Database first:** runs `migrate.php` from the new package (only new files are applied). Migrations only add things, so the old code keeps working with the new tables and columns. The other way round, new code would ask for columns that don't exist yet.
5. Copies the new files over the live ones with `rsync --delete`, **keeping `uploads/`, `.well-known/` and `api/storage/`** (admin images, certificates, sessions and logs).
6. Runs `preflight.php`; it must end with `READY`.
7. **Maintenance mode off**, and removes the package.

If any step fails, it stops with **maintenance mode still on** and says which step. Fix the cause and run it again, or roll back (§9). To look at the maintenance setting at any time: `bash ~/check-maintenance.sh` (read-only).

A change that needs a new cron job or config key says so in its pull request (e.g. the newsletter sender, §6); add those by hand.

**If a migration stops halfway.** MySQL can't roll back table changes, so a failed file can leave part of its work behind. `migrate.php` names the file and the statement that failed, and it doesn't mark that file as applied. Leave maintenance mode on and the old code in place, undo what that file added, fix the cause and run `migrate.php` again. For `027_table_stens.sql` the undo is (save it as `~/undo027.sql` and run `mysql --defaults-extra-file=$HOME/.my.cnf --force transenigma < ~/undo027.sql`; `--force` carries on past a line whose object was never created, e.g. the column if the very first statement failed):
```sql
DROP TABLE IF EXISTS factor_stens;
DELETE FROM domain_norms       WHERE norm_version = 'ipip16-op2019-v2';
DELETE FROM factor_percentiles WHERE norm_version = 'ipip16-op2019-v2';
DELETE FROM factor_norms       WHERE norm_version = 'ipip16-op2019-v2';
DELETE FROM norm_sets          WHERE version      = 'ipip16-op2019-v2';
UPDATE norm_sets SET is_active = IF(version = 'ipip16-op2019-v1', 1, 0);
ALTER TABLE norm_sets DROP COLUMN sten_method;
DELETE FROM schema_migrations WHERE version = '027_table_stens.sql';
```
MySQL refuses this once any test has been scored with v2, which protects those results. After that point a problem is fixed with a new migration, never by undoing 027.

## 9. Rolling back

- **Site files:** each update keeps a copy of the site folder from just before it, `~/site-before-update-<time>.tar.gz` (without `uploads/`). To go back: turn maintenance mode on, rename the live folder (`mv ~/transenigma.com ~/transenigma.com.broken`), unpack the copy (`tar -xzf ~/site-before-update-<time>.tar.gz -C ~`), and move `uploads/` back from `~/transenigma.com.broken`. The database is **not** rolled back by this, so first check which migrations the update applied (`migrate.php --status`, or step 4 of its output):
  - **None, or only new tables and columns** (most updates, e.g. 028–030): putting the old files back is safe; the old code ignores what it doesn't know.
  - **A migration that changed data or behaviour** (e.g. 027, which made norm set v2 active): don't put the old files back on their own. The old code would run against data it doesn't expect (with 027, it would score tests by the old formula but label them v2). Keep maintenance mode on and fix forward with a new update, or follow the migration's own undo notes (§8) **before** restoring the files.
- **Database:** never restore straight over the live database. Anything visitors did since the backup (accounts, test results, registrations) would be lost.
  1. Take a backup of the database as it is **now**: `bash ~/bin/backup-db.sh` (each run writes its own file, `transenigma-<date>-<time>-<n>.sql.gz`; it is deleted after 14 days, so copy it elsewhere if you need it longer).
  2. Create a scratch database in the panel named exactly `transenigma_restore` (the command uses that name). Check the backup file, then restore it into the scratch database; the `&&` and `pipefail` make the command stop and say so if the file is damaged, instead of loading half of it:
     ```
     f=~/backups/transenigma-<date>-<time>-<n>.sql.gz
     gzip -t "$f" && bash -c 'set -o pipefail; gunzip -c "$1" | mysql --defaults-extra-file=$HOME/.my.cnf transenigma_restore' _ "$f" && echo RESTORED
     ```
     Only continue if it printed `RESTORED`. Step by step, with checks: [BACKUPS.md §5](BACKUPS.md).
  3. Compare the two databases. Find the rows created after the backup, e.g. `SELECT … WHERE created_at > '<backup time>'` in `users`, `test_sessions`, `challenge_registrations` and `contact_messages`. Copy the good ones into the restored database, or fix only the broken rows in the live database.
  4. Only then switch production over. Either point `db.name` in `config.php` at the restored database, or copy the corrected tables back into `transenigma`. Keep the step-1 backup until the site has run normally for a while.
- **Whole site:** point the domain back at the old site's backup (§2).
