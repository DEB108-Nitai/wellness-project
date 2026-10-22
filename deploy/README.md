# deploy/

Scripts for the live site on DreamHost. The full guide is [docs/DEPLOY.md](../docs/DEPLOY.md).

| Script | Runs on | When |
|---|---|---|
| `build-package.sh` | developer machine (Git Bash) | Every update: builds `build/transenigma-update.tar.gz` from the current commit |
| `update-site.sh` | server (`~/update-site.sh`) | Every update: backup → maintenance on → migrations → new files → check → maintenance off |
| `setup-backup.sh` | server (keep it in `~`) | Once, and again when the database password changes: writes `~/.my.cnf` from the site config and `~/bin/backup-db.sh` (the nightly backup), then runs it once |
| `check-maintenance.sh` | server, any time | Read-only: maintenance setting, recent settings changes, latest tests |
| `first-install.sh` | server, once | First install only: unpacks the site beside the old one and writes `~/transenigma-config/config.php` (secrets are then typed in by hand) |

The server scripts assume PHP at `/usr/local/php83/bin/php` and the site in `~/transenigma.com`. None of them contains a password: they read the database login from `~/transenigma-config/config.php` or `~/.my.cnf`.
