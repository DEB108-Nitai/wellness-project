#!/bin/bash
# Read-only: when was maintenance mode switched, and who took the latest tests. Changes nothing.
set -euo pipefail
PHP=/usr/local/php83/bin/php
DB=$("$PHP" -r '$c = require $argv[1]; echo $c["db"]["name"];' "$HOME/transenigma-config/config.php")
q() { mysql --defaults-extra-file="$HOME/.my.cnf" "$DB" -t -e "$1"; }

echo "== Maintenance setting now (times are UTC)"
q "SELECT value AS maintenance_on, updated_at FROM settings WHERE setting_key = 'maintenance_mode'"
echo "== Settings changes (from the audit log)"
q "SELECT created_at, LEFT(details, 160) AS what_changed FROM audit_logs WHERE action = 'SETTINGS_UPDATED' ORDER BY id DESC LIMIT 10"
echo "== Latest tests (who took them: guest, user or admin)"
q "SELECT s.public_ref, s.status, s.started_at, s.completed_at, IF(s.user_id IS NULL, 'guest', u.role) AS taken_by
   FROM test_sessions s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.id DESC LIMIT 10"
