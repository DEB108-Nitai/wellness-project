-- =============================================================================
-- Wellness 16PF — core schema (PRD §7)
-- Compatible with MySQL 8.0+ and MariaDB 10.4+. All timestamps are UTC
-- (the PHP connection sets time_zone = '+00:00').
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Accounts & security
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email             VARCHAR(254)    NOT NULL COMMENT 'stored lower-cased',
  name              VARCHAR(100)    NOT NULL,
  password_hash     VARCHAR(255)    NULL     COMMENT 'NULL for Google-only accounts',
  google_sub        VARCHAR(255)    NULL,
  role              ENUM('user','admin')       NOT NULL DEFAULT 'user',
  status            ENUM('active','disabled')  NOT NULL DEFAULT 'active',
  email_verified_at DATETIME        NULL,
  last_login_at     DATETIME        NULL,
  anonymized_at     DATETIME        NULL     COMMENT 'ADM-11',
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_google_sub (google_sub),
  KEY ix_users_role_status (role, status),
  KEY ix_users_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auth_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  type        ENUM('verify_email','reset_password') NOT NULL,
  token_hash  CHAR(64)        NOT NULL COMMENT 'sha256 of the emailed token',
  expires_at  DATETIME        NOT NULL,
  used_at     DATETIME        NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_tokens_hash (token_hash),
  KEY ix_auth_tokens_user_type (user_id, type),
  CONSTRAINT fk_auth_tokens_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rate_limits (
  bucket       VARCHAR(40)  NOT NULL,
  key_hash     CHAR(64)     NOT NULL,
  window_start INT UNSIGNED NOT NULL COMMENT 'unix seconds',
  hits         INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, key_hash, window_start),
  KEY ix_rate_limits_window (window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Psychometric reference data (seeded by 002_reference_data.sql)
-- -----------------------------------------------------------------------------
CREATE TABLE factors (
  code             VARCHAR(3)   NOT NULL,
  name             VARCHAR(60)  NOT NULL,
  low_label        VARCHAR(80)  NOT NULL,
  high_label       VARCHAR(80)  NOT NULL,
  category         ENUM('Interpersonal','Emotional','Cognitive','Self-Regulation') NOT NULL,
  short_desc       VARCHAR(255) NOT NULL,
  detailed_desc    TEXT         NOT NULL,
  low_desc         TEXT         NOT NULL,
  average_desc     TEXT         NOT NULL,
  high_desc        TEXT         NOT NULL,
  workplace_impact TEXT         NOT NULL,
  sort_order       TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE domains (
  code        CHAR(2)      NOT NULL,
  name        VARCHAR(60)  NOT NULL,
  description VARCHAR(255) NOT NULL,
  sort_order  TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE domain_weights (
  domain_code CHAR(2)    NOT NULL,
  factor_code VARCHAR(3) NOT NULL,
  weight      TINYINT    NOT NULL COMMENT '+1 or -1',
  PRIMARY KEY (domain_code, factor_code),
  CONSTRAINT fk_domain_weights_domain FOREIGN KEY (domain_code) REFERENCES domains (code),
  CONSTRAINT fk_domain_weights_factor FOREIGN KEY (factor_code) REFERENCES factors (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE item_sets (
  version     VARCHAR(20)  NOT NULL,
  description VARCHAR(255) NOT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE items (
  id                 INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  item_set_version   VARCHAR(20)       NOT NULL,
  item_code          VARCHAR(8)        NOT NULL COMMENT 'e.g. A1 (IPIP) or ATT1',
  factor_code        VARCHAR(3)        NULL     COMMENT 'NULL for attention checks',
  keyed              ENUM('+','-')     NULL,
  is_attention_check TINYINT(1)        NOT NULL DEFAULT 0,
  expected_answer    TINYINT UNSIGNED  NULL,
  text               VARCHAR(255)      NOT NULL,
  position           SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_items_set_position (item_set_version, position),
  UNIQUE KEY uq_items_set_code (item_set_version, item_code),
  KEY ix_items_factor (factor_code),
  CONSTRAINT fk_items_set FOREIGN KEY (item_set_version) REFERENCES item_sets (version),
  CONSTRAINT fk_items_factor FOREIGN KEY (factor_code) REFERENCES factors (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE norm_sets (
  version     VARCHAR(30)  NOT NULL,
  source      VARCHAR(255) NOT NULL,
  sample_size INT UNSIGNED NOT NULL,
  is_active   TINYINT(1)   NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE factor_norms (
  norm_version VARCHAR(30)  NOT NULL,
  factor_code  VARCHAR(3)   NOT NULL,
  mean         DECIMAL(8,4) NOT NULL,
  sd           DECIMAL(8,4) NOT NULL,
  n            INT UNSIGNED NOT NULL,
  alpha        DECIMAL(4,3) NULL,
  PRIMARY KEY (norm_version, factor_code),
  CONSTRAINT fk_factor_norms_set FOREIGN KEY (norm_version) REFERENCES norm_sets (version),
  CONSTRAINT fk_factor_norms_factor FOREIGN KEY (factor_code) REFERENCES factors (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE factor_percentiles (
  norm_version VARCHAR(30)       NOT NULL,
  factor_code  VARCHAR(3)        NOT NULL,
  raw_score    SMALLINT UNSIGNED NOT NULL,
  percentile   DECIMAL(4,1)      NOT NULL,
  PRIMARY KEY (norm_version, factor_code, raw_score),
  CONSTRAINT fk_factor_pct_set FOREIGN KEY (norm_version) REFERENCES norm_sets (version),
  CONSTRAINT fk_factor_pct_factor FOREIGN KEY (factor_code) REFERENCES factors (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE domain_norms (
  norm_version VARCHAR(30)  NOT NULL,
  domain_code  CHAR(2)      NOT NULL,
  mean         DECIMAL(8,4) NOT NULL,
  sd           DECIMAL(8,4) NOT NULL,
  PRIMARY KEY (norm_version, domain_code),
  CONSTRAINT fk_domain_norms_set FOREIGN KEY (norm_version) REFERENCES norm_sets (version),
  CONSTRAINT fk_domain_norms_domain FOREIGN KEY (domain_code) REFERENCES domains (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Assessment sessions
-- -----------------------------------------------------------------------------
CREATE TABLE test_sessions (
  id               BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  public_ref       CHAR(9)          NOT NULL COMMENT 'WL-XXXXXX',
  user_id          BIGINT UNSIGNED  NULL,
  guest_token_hash CHAR(64)         NULL,
  status           ENUM('in_progress','completed','abandoned','expired') NOT NULL DEFAULT 'in_progress',
  item_set_version VARCHAR(20)      NOT NULL,
  norm_version     VARCHAR(30)      NULL COMMENT 'set when scored',
  current_page     SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  consent_version  VARCHAR(20)      NOT NULL,
  consent_at       DATETIME         NOT NULL,
  country          CHAR(2)          NOT NULL,
  age              TINYINT UNSIGNED NOT NULL,
  gender           ENUM('female','male','non_binary','prefer_not_to_say','self_describe') NOT NULL,
  gender_text      VARCHAR(60)      NULL,
  nickname         VARCHAR(60)      NULL,
  education        VARCHAR(60)      NULL,
  occupation       VARCHAR(100)     NULL,
  started_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_activity_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at     DATETIME         NULL,
  active_seconds   INT UNSIGNED     NOT NULL DEFAULT 0,
  quality_flagged  TINYINT(1)       NULL,
  quality_details  TEXT             NULL COMMENT 'JSON',
  share_token      CHAR(32)         NULL,
  ip_hash          CHAR(64)         NULL,
  user_agent       VARCHAR(255)     NULL,
  updated_at       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sessions_ref (public_ref),
  UNIQUE KEY uq_sessions_share (share_token),
  KEY ix_sessions_user_status (user_id, status),
  KEY ix_sessions_guest_status (guest_token_hash, status),
  KEY ix_sessions_status_completed (status, completed_at),
  KEY ix_sessions_status_activity (status, last_activity_at),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_sessions_item_set FOREIGN KEY (item_set_version) REFERENCES item_sets (version),
  CONSTRAINT fk_sessions_norm_set FOREIGN KEY (norm_version) REFERENCES norm_sets (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE session_answers (
  session_id  BIGINT UNSIGNED  NOT NULL,
  item_id     INT UNSIGNED     NOT NULL,
  value       TINYINT UNSIGNED NOT NULL,
  answered_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id, item_id),
  CONSTRAINT fk_answers_session FOREIGN KEY (session_id) REFERENCES test_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_answers_item FOREIGN KEY (item_id) REFERENCES items (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE session_page_times (
  session_id BIGINT UNSIGNED   NOT NULL,
  page       SMALLINT UNSIGNED NOT NULL,
  seconds    INT UNSIGNED      NOT NULL DEFAULT 0,
  PRIMARY KEY (session_id, page),
  CONSTRAINT fk_page_times_session FOREIGN KEY (session_id) REFERENCES test_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE session_factor_scores (
  session_id  BIGINT UNSIGNED   NOT NULL,
  factor_code VARCHAR(3)        NOT NULL,
  raw_score   SMALLINT UNSIGNED NOT NULL,
  z_score     DECIMAL(6,3)      NOT NULL,
  sten        TINYINT UNSIGNED  NOT NULL,
  percentile  DECIMAL(4,1)      NOT NULL,
  band        ENUM('low','average','high') NOT NULL,
  PRIMARY KEY (session_id, factor_code),
  CONSTRAINT fk_factor_scores_session FOREIGN KEY (session_id) REFERENCES test_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_factor_scores_factor FOREIGN KEY (factor_code) REFERENCES factors (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE session_domain_scores (
  session_id  BIGINT UNSIGNED  NOT NULL,
  domain_code CHAR(2)          NOT NULL,
  composite   DECIMAL(7,3)     NOT NULL,
  z_score     DECIMAL(6,3)     NOT NULL,
  sten        TINYINT UNSIGNED NOT NULL,
  band        ENUM('low','average','high') NOT NULL,
  PRIMARY KEY (session_id, domain_code),
  CONSTRAINT fk_domain_scores_session FOREIGN KEY (session_id) REFERENCES test_sessions (id) ON DELETE CASCADE,
  CONSTRAINT fk_domain_scores_domain FOREIGN KEY (domain_code) REFERENCES domains (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE session_reviews (
  session_id BIGINT UNSIGNED  NOT NULL,
  rating     TINYINT UNSIGNED NOT NULL,
  comment    VARCHAR(1000)    NULL,
  created_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (session_id),
  CONSTRAINT fk_reviews_session FOREIGN KEY (session_id) REFERENCES test_sessions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 60-Day Challenge (STI + TTI in one table — CH-7)
-- -----------------------------------------------------------------------------
CREATE TABLE challenge_registrations (
  id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  ref_code      VARCHAR(16)      NOT NULL COMMENT 'STI-60-XXXXXX / TTI-60-XXXXXX',
  program       ENUM('STI','TTI') NOT NULL,
  user_id       BIGINT UNSIGNED  NULL,
  name          VARCHAR(100)     NOT NULL,
  email         VARCHAR(254)     NOT NULL,
  phone         VARCHAR(20)      NOT NULL,
  age           TINYINT UNSIGNED NULL,
  city          VARCHAR(100)     NULL,
  country       CHAR(2)          NULL,
  cohort_timing ENUM('morning','evening','weekend') NOT NULL,
  struggles     TEXT             NOT NULL COMMENT 'JSON array of strings',
  primary_goal  VARCHAR(1000)    NULL,
  consent_at    DATETIME         NOT NULL,
  status        ENUM('registered','confirmed','waitlisted','completed','cancelled') NOT NULL DEFAULT 'registered',
  admin_notes   TEXT             NULL,
  ip_hash       CHAR(64)         NULL,
  created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_registrations_ref (ref_code),
  KEY ix_registrations_email_program (email, program, status),
  KEY ix_registrations_program_created (program, created_at),
  KEY ix_registrations_status_created (status, created_at),
  KEY ix_registrations_user (user_id),
  CONSTRAINT fk_registrations_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Site: contact, newsletter, FAQ, settings
-- -----------------------------------------------------------------------------
CREATE TABLE contact_messages (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100)    NOT NULL,
  email      VARCHAR(254)    NOT NULL,
  subject    VARCHAR(150)    NOT NULL,
  message    TEXT            NOT NULL,
  status     ENUM('new','handled') NOT NULL DEFAULT 'new',
  handled_by BIGINT UNSIGNED NULL,
  handled_at DATETIME        NULL,
  ip_hash    CHAR(64)        NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_messages_status_created (status, created_at),
  CONSTRAINT fk_messages_handler FOREIGN KEY (handled_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE newsletter_subscribers (
  id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email             VARCHAR(254)    NOT NULL,
  status            ENUM('subscribed','unsubscribed') NOT NULL DEFAULT 'subscribed',
  unsubscribe_token CHAR(32)        NOT NULL,
  created_at        DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  unsubscribed_at   DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_newsletter_email (email),
  UNIQUE KEY uq_newsletter_token (unsubscribe_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE faqs (
  id           INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  category     VARCHAR(40)       NOT NULL,
  question     VARCHAR(255)      NOT NULL,
  answer       TEXT              NOT NULL,
  sort_order   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_published TINYINT(1)        NOT NULL DEFAULT 1,
  updated_at   DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_faqs_published_order (is_published, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE settings (
  setting_key VARCHAR(64)     NOT NULL,
  value       TEXT            NOT NULL,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  updated_by  BIGINT UNSIGNED NULL,
  PRIMARY KEY (setting_key),
  CONSTRAINT fk_settings_user FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Audit & email logs
-- -----------------------------------------------------------------------------
CREATE TABLE audit_logs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  actor_type    ENUM('guest','user','admin','system') NOT NULL,
  action        VARCHAR(64)     NOT NULL,
  entity_type   VARCHAR(40)     NULL,
  entity_id     VARCHAR(64)     NULL,
  details       TEXT            NULL COMMENT 'JSON',
  ip_hash       CHAR(64)        NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_audit_created (created_at),
  KEY ix_audit_action (action, created_at),
  KEY ix_audit_actor (actor_user_id, created_at),
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE email_log (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  to_email   VARCHAR(254)    NOT NULL,
  template   VARCHAR(60)     NOT NULL,
  status     ENUM('sent','failed') NOT NULL,
  error      VARCHAR(500)    NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_email_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
