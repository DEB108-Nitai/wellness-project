-- Phase 5 slice F2 (owner request 2026-10-12): several admins, and exactly one primary admin who alone adds,
-- removes and hands over admin rights. The first admin (lowest id) becomes the primary admin.
-- primary_lock is NULL for everyone except the primary admin, so the unique key allows at most one.

ALTER TABLE users
  ADD COLUMN is_primary_admin TINYINT(1)      NOT NULL DEFAULT 0 AFTER role,
  ADD COLUMN admin_added_by   BIGINT UNSIGNED NULL AFTER is_primary_admin,
  ADD COLUMN admin_added_at   DATETIME        NULL AFTER admin_added_by,
  ADD COLUMN primary_lock     TINYINT GENERATED ALWAYS AS (IF(is_primary_admin = 1, 1, NULL)) STORED,
  ADD UNIQUE KEY uq_users_primary_admin (primary_lock),
  ADD CONSTRAINT fk_users_admin_added_by FOREIGN KEY (admin_added_by) REFERENCES users (id) ON DELETE SET NULL;

UPDATE users SET is_primary_admin = 1 WHERE role = 'admin' ORDER BY id LIMIT 1;
