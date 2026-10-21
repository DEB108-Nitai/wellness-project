-- Replies sent from the admin console to contact-form messages (owner, 2026-10-21).
-- The site emails each reply from the support address; this keeps what was sent, by whom and when.
-- Deleting a message (e.g. when an account is anonymised) deletes its replies too.
CREATE TABLE contact_message_replies (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  message_id  BIGINT UNSIGNED NOT NULL,
  admin_id    BIGINT UNSIGNED NULL,
  body        TEXT            NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_replies_message (message_id, created_at),
  CONSTRAINT fk_replies_message FOREIGN KEY (message_id) REFERENCES contact_messages (id) ON DELETE CASCADE,
  CONSTRAINT fk_replies_admin FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
