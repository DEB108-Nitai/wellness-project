#!/bin/bash
# Sets up the nightly Transenigma database backup and runs it once.
# Reads the database login from the site config (never printed) into ~/.my.cnf (mode 600).
set -euo pipefail

PHP=/usr/local/php83/bin/php
CONF="$HOME/transenigma-config/config.php"
[ -f "$CONF" ] || { echo "STOP: $CONF not found."; exit 1; }

echo "1. Writing ~/.my.cnf from the site config (password not shown)"
umask 077
"$PHP" -r '
$c = require $argv[1];
$q = static fn (string $v): string => "\"" . addcslashes($v, "\"\\") . "\"";
$out = "[client]\nhost=" . $c["db"]["host"] . "\nport=" . (int) ($c["db"]["port"] ?? 3306)
     . "\nuser=" . $c["db"]["user"] . "\npassword=" . $q((string) $c["db"]["pass"]) . "\n";
file_put_contents($argv[2], $out);
echo "   database: ", $c["db"]["name"], "\n";
file_put_contents($argv[3], $c["db"]["name"]);
' "$CONF" "$HOME/.my.cnf" "$HOME/.te-dbname"
chmod 600 "$HOME/.my.cnf"
DB=$(cat "$HOME/.te-dbname"); rm -f "$HOME/.te-dbname"

echo "2. Writing ~/bin/backup-db.sh"
mkdir -p "$HOME/bin"
cat > "$HOME/bin/backup-db.sh" <<EOF
#!/bin/bash
# MySQL + uploads backup for Transenigma (nightly cron, and before every update): fail on any error, verify,
# then rotate (14 days). Each run gets its own file (date and time), so an update's backup never replaces that
# night's one, and two runs at once never write the same temporary file.
set -euo pipefail
umask 077
mkdir -p "\$HOME/backups" && chmod 700 "\$HOME/backups"
stamp=\$(date +%F-%H%M%S)
out="\$HOME/backups/transenigma-\$stamp.sql.gz"
tmp="\$out.tmp.\$\$"
find "\$HOME/backups" -name '*.tmp.*' -mtime +1 -delete   # left behind by a run that failed
mysqldump --defaults-extra-file="\$HOME/.my.cnf" --single-transaction --no-tablespaces $DB | gzip > "\$tmp"
gzip -t "\$tmp"
zcat "\$tmp" | tail -n 1 | grep -q "Dump completed"
mv "\$tmp" "\$out"
find "\$HOME/backups" -name 'transenigma-*.sql.gz' -mtime +14 -delete
# Admin-uploaded images are live content too (the database points at them).
if [ -d "\$HOME/transenigma.com/uploads" ]; then
  up="\$HOME/backups/transenigma-uploads-\$stamp.tar.gz"
  tar -czf "\$up.tmp.\$\$" -C "\$HOME/transenigma.com" uploads
  tar -tzf "\$up.tmp.\$\$" > /dev/null
  mv "\$up.tmp.\$\$" "\$up"
  find "\$HOME/backups" -name 'transenigma-uploads-*.tar.gz' -mtime +14 -delete
fi
EOF
chmod 700 "$HOME/bin/backup-db.sh"

echo "3. Running the backup once"
bash "$HOME/bin/backup-db.sh"
ls -lh "$HOME/backups"
echo "   tables in the backup: $(zcat "$(ls -t "$HOME"/backups/transenigma-*.sql.gz | head -1)" | grep -c '^CREATE TABLE')"
ls -l "$HOME/.my.cnf"
echo
echo "DONE. Backups work."
