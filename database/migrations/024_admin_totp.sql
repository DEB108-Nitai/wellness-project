-- Phase 5 slice G: admin two-factor sign-in (PRD ADM-12, O-5).
-- The authenticator secret is stored encrypted (AES-256-GCM, key derived from app.secret); recovery codes
-- only as SHA-256 hashes. totp_last_step stops a code from being used twice within its 30-second window.

ALTER TABLE users
  ADD COLUMN totp_secret_enc VARCHAR(255)    NULL COMMENT 'ADM-12: encrypted authenticator secret' AFTER session_version,
  ADD COLUMN totp_enabled_at DATETIME        NULL AFTER totp_secret_enc,
  ADD COLUMN totp_last_step  BIGINT UNSIGNED NULL COMMENT 'last accepted 30 s step (no reuse)' AFTER totp_enabled_at;

CREATE TABLE admin_recovery_codes (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  code_hash  CHAR(64)        NOT NULL COMMENT 'sha256 of the normalised code',
  used_at    DATETIME        NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_recovery_user_hash (user_id, code_hash),
  CONSTRAINT fk_recovery_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
