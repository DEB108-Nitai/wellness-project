#!/bin/bash
# FIRST INSTALL ONLY (used once, 2026-10-19; for a new server or a full rebuild, DEPLOY.md §3-5).
# Expects ~/transenigma-site.tar.gz (a package from deploy/build-package.sh, renamed).
# Stages the new Transenigma site beside the live one and prepares its config.
# Changes nothing that visitors see. Safe to stop at any point; refuses to run twice.
# Usage (names from Panel -> MySQL Databases; the password is typed into the config afterwards):
#   DB_NAME=<database> DB_USER=<database user> bash first-install.sh
set -euo pipefail
: "${DB_NAME:?Set DB_NAME (the MySQL database name from the DreamHost panel)}"
: "${DB_USER:?Set DB_USER (the MySQL user name from the DreamHost panel)}"

NEW="$HOME/transenigma.com-new"
LIVE="$HOME/transenigma.com"
CONF_DIR="$HOME/transenigma-config"
CONF="$CONF_DIR/config.php"
PKG="$HOME/transenigma-site.tar.gz"

[ -f "$PKG" ] || { echo "STOP: $PKG not found. Upload it first."; exit 1; }
[ -e "$NEW" ] && { echo "STOP: $NEW already exists (setup already ran). Nothing changed."; exit 1; }
[ -e "$CONF" ] && { echo "STOP: $CONF already exists. Nothing changed."; exit 1; }

echo "1. Unpacking the new site into $NEW"
mkdir "$NEW"
tar -xzf "$PKG" -C "$NEW"
[ -d "$LIVE/.well-known" ] && cp -a "$LIVE/.well-known" "$NEW/"
find "$NEW" -type d -exec chmod 755 {} +
find "$NEW" -type f -exec chmod 644 {} +

echo "2. Creating the config outside the web folder: $CONF"
mkdir -p "$CONF_DIR"
chmod 700 "$CONF_DIR"
cp "$NEW/api/config/config.example.php" "$CONF"
chmod 600 "$CONF"

SECRET=$(/usr/local/php83/bin/php -r 'echo bin2hex(random_bytes(32));')
sed -i \
  -e "s|'env' => 'local',|'env' => 'production',|" \
  -e "s|'debug' => true,|'debug' => false,|" \
  -e "s|'url' => 'http://localhost:3000',|'url' => 'https://transenigma.com',|" \
  -e "s|'secret' => 'REPLACE_WITH_64_HEX_CHARS',|'secret' => '$SECRET',|" \
  -e "s|'host' => 'localhost',|'host' => 'mysql.transenigma.com',|" \
  -e "s|'name' => 'transenigma',|'name' => '$DB_NAME',|" \
  -e "s|'user' => 'transenigma_app',|'user' => '$DB_USER',|" \
  -e "s|'host' => '',|'host' => 'smtp.dreamhost.com',|" \
  -e "s|'username' => '',|'username' => 'support@transenigma.com',|" \
  -e "s|'from_email' => '',|'from_email' => 'support@transenigma.com',|" \
  "$CONF"
unset SECRET

echo "3. Checking"
/usr/local/php83/bin/php -l "$CONF" > /dev/null && echo "   config file syntax: ok"
for want in "'env' => 'production'" "'debug' => false" "'url' => 'https://transenigma.com'" \
            "'host' => 'mysql.transenigma.com'" "'name' => '$DB_NAME'" "'user' => '$DB_USER'" \
            "'host' => 'smtp.dreamhost.com'" "'username' => 'support@transenigma.com'"; do
  grep -qF "$want" "$CONF" && echo "   set: $want" || echo "   MISSING: $want"
done
grep -qE "'secret' => '[0-9a-f]{64}'" "$CONF" && echo "   set: app.secret (64 hex characters, not shown)" || echo "   MISSING: app.secret"
echo "   files in the new site: $(find "$NEW" -type f | wc -l)"
ls -ld "$NEW" "$CONF_DIR" "$CONF"

echo
echo "DONE. The live site is unchanged. Next: type the 4 secrets into $CONF"
