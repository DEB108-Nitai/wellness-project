# Deploying Transenigma to DreamHost

This guide takes the site from this repository to **https://transenigma.com** on DreamHost shared hosting (PHP 8.2 + MySQL). The server never runs Node: the React app is built on a developer machine and uploaded as static files, next to the PHP API.

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

---

## 5. Database and admin account

DreamHost's PHP 8.2 command-line binary is usually `/usr/local/php82/bin/php`.
```
cd ~/transenigma.com
/usr/local/php82/bin/php api/bin/migrate.php            # creates every table and the content (001…020)
/usr/local/php82/bin/php api/bin/migrate.php --status   # all applied
/usr/local/php82/bin/php api/bin/create-admin.php you@transenigma.com "Your Name"
```
`create-admin` asks for the password twice, and checks it against the password policy. The password is **visible while you type**, so make sure nobody is watching the screen. It is stored only as an Argon2id hash.

**Two-step sign-in (every admin):**
- At the first sign-in on the live site, the admin scans a QR code with an authenticator app (Google Authenticator, Microsoft Authenticator…) and saves **10 recovery codes**. After that, every admin sign-in needs a code from the app.
- The app secret is encrypted with `app.secret`. Setting a new `app.secret` makes saved app secrets unreadable: admins then sign in with a recovery code and use **Security → Move to a new phone**, or are reset as below. So set the final `app.secret` **before** the admins set up their phones.
- **Lost phone and recovery codes:** reset from the server, and the admin sets it up again at their next sign-in:
  ```
  /usr/local/php82/bin/php api/bin/create-admin.php --reset-2fa admin@transenigma.com
  ```

---

## 6. Cron jobs (Panel → Advanced → Cron Jobs)

| Job | Schedule | Command |
|---|---|---|
| Housekeeping | daily, 03:00 | `/usr/local/php82/bin/php /home/<user>/transenigma.com/api/bin/cron-daily.php` |
| Database backup (14 days kept) | daily, 03:30 | `bash $HOME/bin/backup-db.sh` (script below) |

For the backup, create `~/.my.cnf` (mode 600) so the password is not in the cron line:
```
[client]
host=mysql.transenigma.com
user=transenigma_app
password=...
```

Then create `~/bin/backup-db.sh`. It fails loudly instead of hiding a broken dump, and it only deletes old backups after a new one has been checked:
```bash
#!/bin/bash
# Daily MySQL backup for Transenigma: fail on any error, verify, then rotate (14 days).
set -euo pipefail                      # a failed mysqldump fails the whole pipeline
umask 077                              # backups readable by this user only
mkdir -p "$HOME/backups" && chmod 700 "$HOME/backups"
out="$HOME/backups/transenigma-$(date +%F).sql.gz"
tmp="$out.tmp"
mysqldump --defaults-extra-file="$HOME/.my.cnf" --single-transaction transenigma | gzip > "$tmp"
gzip -t "$tmp"                                          # the archive is readable
zcat "$tmp" | tail -n 1 | grep -q "Dump completed"      # mysqldump finished the dump
mv "$tmp" "$out"
find "$HOME/backups" -name 'transenigma-*.sql.gz' -mtime +14 -delete   # only after a good backup
# Admin-uploaded images are live content too (the database points at them).
if [ -d "$HOME/transenigma.com/uploads" ]; then
  tar -czf "$HOME/backups/transenigma-uploads-$(date +%F).tar.gz" -C "$HOME/transenigma.com" uploads
  find "$HOME/backups" -name 'transenigma-uploads-*.tar.gz' -mtime +14 -delete
fi
```

- **Set up:** run `chmod 700 ~/bin/backup-db.sh`, then run the script once by hand and check that a `.sql.gz` file appears in `~/backups`.
- **Before relying on it:** test a restore into a scratch database (§9).
- **If a run fails:** cron emails the error (set the cron job's email address in the panel), and the existing backups are kept.

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
- [ ] Email authentication for transenigma.com: SPF and DKIM records exist (DreamHost panel → Mail → or the DNS provider). Then send one **password reset to a Gmail address** and confirm it lands in the inbox, not Spam.

**By hand:**
- [ ] `http://` and `www.` addresses end up on `https://transenigma.com` (the redirect check above covers `www`).
- [ ] Every menu page loads: Home, Programs, 16PF Test pages, Research, Consultancy, Our Team, Contact, Privacy, Terms.
- [ ] Refreshing a deep page (e.g. `/research#drug-discovery`) works, with no 404.
- [ ] Take the test as a guest → submit → sign up → **verification email arrives** → report opens.
- [ ] Forgot password → **reset email arrives** → new password works.
- [ ] Google sign-in (if configured).
- [ ] 60-day program registration → "Registered successfully" → **confirmation email arrives**.
- [ ] Contact form → **notification arrives at support@transenigma.com**.
- [ ] Newsletter subscribe/unsubscribe.
- [ ] Admin: sign in → set up two-step sign-in on your phone → save the recovery codes → Registrations and Settings work. Sign out and in again: the code is asked for. A normal account is refused.
- [ ] Phone check: menu drawer, research cards swipe, no sideways scrolling.
- [ ] `https://transenigma.com/robots.txt` and `/sitemap.xml` load. Submit the sitemap in Google Search Console.
- [ ] `https://transenigma.com/api/config/config.example.php` and `/database/migrations/` return **403**.
- [ ] **10-minute sign-in check** with a fresh Gmail address: sign up → verification email → click it (signed in) → sign out → sign in → forgot password → reset → sign in with the new password → Google sign-in → open `/admin` as that normal user and confirm it is refused.
- [ ] Delete any test accounts created during these checks.

---

## 8. Updating the site later

1. On a developer machine: pull, `npm ci`, tests, `npm run build`.
2. Upload the new `dist/` contents (replace `assets/`; old hashed files can be deleted), plus any changed `api/` files and new `database/migrations/` files. **Never delete or replace the `uploads/` folder**: it holds the images admins uploaded, and the site points at them.
3. Over SSH: `/usr/local/php82/bin/php api/bin/migrate.php` (applies only the new migrations).

## 9. Rolling back

- **Frontend:** re-upload the previous `dist/`.
- **Database:** never restore straight over the live database. Anything visitors did since the backup (accounts, test results, registrations) would be lost.
  1. Take a backup of the database as it is **now**: `bash ~/bin/backup-db.sh` (rename the file it writes, e.g. `transenigma-YYYY-MM-DD-before-restore.sql.gz`, so the next run doesn't replace it).
  2. Create a scratch database in the panel (e.g. `transenigma_restore`). Restore last night's backup into it: `gunzip -c ~/backups/transenigma-YYYY-MM-DD.sql.gz | mysql --defaults-extra-file=$HOME/.my.cnf transenigma_restore`.
  3. Compare the two databases. Find the rows created after the backup, e.g. `SELECT … WHERE created_at > '<backup time>'` in `users`, `test_sessions`, `challenge_registrations` and `contact_messages`. Copy the good ones into the restored database, or fix only the broken rows in the live database.
  4. Only then switch production over. Either point `db.name` in `config.php` at the restored database, or copy the corrected tables back into `transenigma`. Keep the step-1 backup until the site has run normally for a while.
- **Whole site:** point the domain back at the old site's backup (§2).
