# Backups: where they are, how to keep them, how to restore

A step-by-step guide for doing it yourself. Every command can be copied as it is; replace the parts in `<angle brackets>`.

- `<user>` is the site's SSH user: DreamHost panel → **Websites → SFTP/SSH users**.
- Commands that start with `ssh` or `scp` run in **PowerShell on your PC**. Windows 10 and 11 have both built in. They ask for the SSH password.
- To type several commands on the server, log in first with `ssh <user>@transenigma.com`, then type them one by one. `exit` logs out.

---

## 1. What is backed up, and where

Everything below is on the **DreamHost server**, in the SSH user's home folder (`~`). Nothing is kept on any PC unless you download it (§3).

Backup files are named by date, time and a run number, e.g. `transenigma-2026-10-23-030001-48213.sql.gz`. In the commands below, copy the exact name from `ls -lt ~/backups` wherever it says `<date>-<time>-<n>`.

| What | Where | Made | Kept |
|---|---|---|---|
| **Database** (accounts, test results, registrations, messages, newsletters, settings, website content) | `~/backups/transenigma-<date>-<time>-<n>.sql.gz` | every night (cron), and before every update | 14 days |
| **Uploaded images** (consultancy and newsletter pictures) | `~/backups/transenigma-uploads-<date>-<time>-<n>.tar.gz` | together with each database backup | 14 days |
| **Website files as they were before an update** | `~/site-before-update-<date>-<time>.tar.gz` | by every update (`update-site.sh`) | until you delete them |
| **The old website** (before 2026-10-19) | `~/transenigma.com-old-2026-10-19/` and `~/old-site-backup-2026-10-19.tar.gz` | once, at launch | until you delete them |
| **Every version of the code** | GitHub, repository `wellness-project` (§6) | every commit | forever |
| **Secrets** (passwords, `app.secret`) | only in `~/transenigma-config/config.php`, never in a backup file | – | – |

> Because all backups sit on the same server, losing the DreamHost account would lose them too. **Download them once a month** (§3).

## 2. Is it working? (1 minute)

```
ssh <user>@transenigma.com "ls -lt ~/backups | head -5"
```
The top lines should be today's or last night's files, a few hundred KB or more each. If the newest one is older than two days, the nightly job is not running: check DreamHost panel → **Cron Jobs**, and the cron emails in `transenigma7@gmail.com`.

## 3. Download the backups to your PC (once a month)

In PowerShell:
```
mkdir C:\Transenigma-backups\<year-month>
scp -r <user>@transenigma.com:~/backups/* C:\Transenigma-backups\<year-month>\
```
Without the command line, use **WinSCP** or **FileZilla**: host `transenigma.com`, protocol **SFTP**, the SSH user and password. Then copy the `backups` folder to your PC.

Keep these copies somewhere safe and private, such as a company drive. They contain people's personal data (emails, test results), so never share them or upload them to a public place.

## 4. Take a backup right now (e.g. before a risky change)

```
ssh <user>@transenigma.com "bash ~/bin/backup-db.sh && ls -lt ~/backups | head -3"
```
This makes a new database and images backup immediately. Every update also does it automatically.

**To keep a backup longer than 14 days**, copy it out of the rotation:
```
ssh <user>@transenigma.com "mkdir -p ~/kept-backups && cp ~/backups/transenigma-<date>-<time>-<n>.sql.gz ~/kept-backups/"
```
(or download it, §3).

## 5. Restore

### 5a. The database

Never load a backup straight over the live database: everything since the backup (new accounts, tests, registrations) would be lost. Restore it next to the live one, check it, then switch.

1. **DreamHost panel → MySQL Databases → Add new database**: name it exactly `transenigma_restore` (the commands below use that name), on the same host, and give **the same database user** as the live one access.
2. Log in: `ssh <user>@transenigma.com`
3. See which backups there are: `ls -lt ~/backups`
4. Restore the one you want into the new database. The first line checks the file is not damaged; it only prints `RESTORED` if everything worked:
   ```
   f=~/backups/transenigma-<date>-<time>-<n>.sql.gz
   gzip -t "$f" && bash -c 'set -o pipefail; gunzip -c "$1" | mysql --defaults-extra-file=$HOME/.my.cnf transenigma_restore' _ "$f" && echo RESTORED
   ```
5. Look at it, e.g. how many accounts it has: `mysql --defaults-extra-file=$HOME/.my.cnf transenigma_restore -e "SELECT COUNT(*) FROM users"`
6. **Switch the site to it** (only once you are sure):
   - Admin → Settings → turn **maintenance mode on**.
   - Take a backup of the current database first (§4), so the switch can be undone.
   - Edit the config: `nano ~/transenigma-config/config.php`. Under `db`, change `'name' => '...'` to `'name' => 'transenigma_restore'`, then save with Ctrl+O and Enter, and quit with Ctrl+X.
   - Check: `/usr/local/php83/bin/php ~/transenigma.com/api/bin/preflight.php`. It must end with `READY`.
   - Turn maintenance mode off.
   - **The nightly backup reads the database name from the config only when it is set up:** run `bash ~/setup-backup.sh` once more, so it backs up the new database from now on.
   - To undo: put the old name back in `config.php` the same way.

If only a few rows are wrong, it is usually better to copy those rows from the restored database into the live one than to switch databases. That is a job for a developer; [DEPLOY.md §9](DEPLOY.md) has the details.

### 5b. Uploaded images

```
ssh <user>@transenigma.com "tar -xzf ~/backups/transenigma-uploads-<date>-<time>-<n>.tar.gz -C ~/transenigma.com && echo RESTORED"
```
This puts back the images from that backup. Images uploaded later stay.

### 5c. The website files (undo an update)

Every update saved the previous files as `~/site-before-update-<date>-<time>.tar.gz`. **First read [DEPLOY.md §9](DEPLOY.md):** it is only safe when the update you undo did not change data in the database (most do not). Then:
```
ssh <user>@transenigma.com
ls -lt ~/site-before-update-*                       # pick the one from just before the bad update
mv ~/transenigma.com ~/transenigma.com.broken
tar -xzf ~/site-before-update-<date>-<time>.tar.gz -C ~
mv ~/transenigma.com.broken/uploads ~/transenigma.com/
/usr/local/php83/bin/php ~/transenigma.com/api/bin/preflight.php     # must end with READY
```
Once the site works again, delete `~/transenigma.com.broken`.

## 6. Old versions of the code (GitHub)

GitHub keeps every version ever committed; nothing there is lost when the site changes.

- **See them:** the repository page → **Commits** (or **Pull requests → Closed** for each change with its description).
- **Download one** without any tools: open a commit → **Browse files** → **Code → Download ZIP**.
- **Mark the version that went live** after each update, so it is easy to find later. On a PC with the code (Git Bash, in the project folder):
  ```
  git tag live-<date> && git push origin live-<date>
  ```
  The tags then appear under **Tags** on GitHub.
- **Put an older version live again:** a developer checks it out (`git checkout live-<date>`), builds the package (`bash deploy/build-package.sh`) and updates as usual ([DEPLOY.md §8](DEPLOY.md)). The same database rule as §5c applies.

## 7. When something goes wrong

| Symptom | What to do |
|---|---|
| A cron email shows an error from `backup-db.sh` | The backup of that night failed; older ones are kept. Common causes: the database password was changed (run `bash ~/setup-backup.sh` again, it reads the new one from `config.php`), or the disk is full (§2, delete old `~/site-before-update-*` files) |
| `ls ~/backups` shows nothing new for days | The cron job is missing or failing: DreamHost panel → Cron Jobs |
| The restore command printed an error instead of `RESTORED` | That backup file is damaged; take the next older one |
| The site shows errors after a restore | Turn maintenance mode on, put the previous `db.name` back (§5a) or the previous files back (§5c) |
