#!/bin/bash
# Updates the live Transenigma site from ~/transenigma-update.tar.gz (DEPLOY.md §8, scripted):
# backup -> maintenance on -> database migrations -> new files -> server check -> maintenance off.
# Keeps uploads/, .well-known/ and api/storage/ (sessions, logs). Stops with maintenance ON if anything fails.
set -euo pipefail

PHP=/usr/local/php83/bin/php
LIVE="$HOME/transenigma.com"
PKG="$HOME/transenigma-update.tar.gz"
STAGE="$HOME/transenigma-update"
CONF="$HOME/transenigma-config/config.php"
STAMP=$(date +%Y%m%d-%H%M%S)

[ -f "$PKG" ] || { echo "STOP: $PKG not found. Upload it first."; exit 1; }
[ -f "$LIVE/index.html" ] || { echo "STOP: $LIVE does not look like the live site."; exit 1; }
command -v rsync > /dev/null || { echo "STOP: rsync is not available on this server. Nothing changed."; exit 1; }
DB=$("$PHP" -r '$c = require $argv[1]; echo $c["db"]["name"];' "$CONF")
sql() { mysql --defaults-extra-file="$HOME/.my.cnf" "$DB" -N -e "$1"; }
fail() { echo; echo "FAILED at: $1"; echo "Maintenance mode is still ON, so visitors see the maintenance page. Send this output to the developer."; exit 1; }

echo "1. Backups"
bash "$HOME/bin/backup-db.sh" || { echo "STOP: database backup failed. Nothing changed."; exit 1; }
tar -czf "$HOME/site-before-update-$STAMP.tar.gz" -C "$HOME" --exclude='transenigma.com/uploads' transenigma.com
echo "   database: $(ls -t "$HOME"/backups/transenigma-*.sql.gz | head -1)"
echo "   site files: $HOME/site-before-update-$STAMP.tar.gz"

echo "2. Unpacking the update"
rm -rf "$STAGE"
mkdir "$STAGE"
tar -xzf "$PKG" -C "$STAGE"
find "$STAGE" -type d -exec chmod 755 {} +
find "$STAGE" -type f -exec chmod 644 {} +
echo "   files: $(find "$STAGE" -type f | wc -l)"

echo "3. Maintenance mode ON"
sql "UPDATE settings SET value = '1' WHERE setting_key = 'maintenance_mode'" || fail "maintenance on"

echo "4. Database changes"
(cd "$STAGE" && "$PHP" api/bin/migrate.php) || fail "migrations (the new files were NOT installed)"

echo "5. Installing the new files (uploads, .well-known and api/storage are kept)"
rsync -a --delete \
  --exclude='/uploads/' --exclude='/.well-known/' --exclude='/.dh-diag' --exclude='/api/storage/' \
  "$STAGE/" "$LIVE/" || fail "copying files"

echo "6. Server check"
(cd "$LIVE" && "$PHP" api/bin/preflight.php | tail -3)
(cd "$LIVE" && "$PHP" api/bin/preflight.php | grep -q '^READY') || fail "server check"

echo "7. Maintenance mode OFF"
sql "UPDATE settings SET value = '0' WHERE setting_key = 'maintenance_mode'" || fail "maintenance off"
rm -rf "$STAGE" "$PKG"

echo
echo "DONE. The update is live."
