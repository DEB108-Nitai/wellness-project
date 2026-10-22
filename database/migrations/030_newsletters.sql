-- Newsletters written and sent from the admin console (owner, 2026-10-22).
-- A newsletter is a draft until an admin sends it; sending puts one row per subscriber in newsletter_deliveries,
-- which api/bin/send-newsletters.php (cron, every 10 minutes) works through under the hourly mail limit.
CREATE TABLE newsletters (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject      VARCHAR(200)    NOT NULL DEFAULT '',
  preheader    VARCHAR(200)    NOT NULL DEFAULT '',
  cover_image  VARCHAR(255)    NULL,
  blocks       MEDIUMTEXT      NOT NULL,           -- JSON list of {type, ...} built by the editor
  status       ENUM('draft','sending','sent') NOT NULL DEFAULT 'draft',
  recipients   INT UNSIGNED    NOT NULL DEFAULT 0, -- subscribers when it was sent
  created_by   BIGINT UNSIGNED NULL,
  sent_by      BIGINT UNSIGNED NULL,
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  queued_at    DATETIME        NULL,
  finished_at  DATETIME        NULL,
  PRIMARY KEY (id),
  KEY ix_newsletters_status (status, updated_at),
  CONSTRAINT fk_newsletters_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_newsletters_sent_by FOREIGN KEY (sent_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per subscriber per newsletter. 'skipped' = they unsubscribed before their turn came.
CREATE TABLE newsletter_deliveries (
  id             BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  newsletter_id  BIGINT UNSIGNED  NOT NULL,
  subscriber_id  BIGINT UNSIGNED  NOT NULL,
  status         ENUM('pending','sent','failed','skipped') NOT NULL DEFAULT 'pending',
  attempts       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  attempted_at   DATETIME         NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_delivery (newsletter_id, subscriber_id),
  KEY ix_deliveries_queue (status, id),
  KEY ix_deliveries_attempted (attempted_at),
  CONSTRAINT fk_deliveries_newsletter FOREIGN KEY (newsletter_id) REFERENCES newsletters (id) ON DELETE CASCADE,
  CONSTRAINT fk_deliveries_subscriber FOREIGN KEY (subscriber_id) REFERENCES newsletter_subscribers (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
