-- Phase 5 slice D: a private, first-party visit counter (owner decision 2026-10-12).
-- Nothing personal is stored:
-- * no cookie, IP address, user agent or account id;
-- * visitor_hash = HMAC(random salt of that UTC day, IP | user agent). The salt is created on the day's
--   first visit and deleted once the day is over (cron), after which no one, not even with the server's
--   secrets, can work a hash back to an address or link one day's visitors to another's;
-- * signed_in only says whether the page was viewed while signed in (for a daily count of members).
-- Raw rows are kept 90 days (cron), daily totals for good.

CREATE TABLE visit_salts (
  day  DATE     NOT NULL,
  salt CHAR(64) NOT NULL,
  PRIMARY KEY (day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE page_views (
  id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT,
  day           DATE             NOT NULL COMMENT 'UTC day of the visit',
  path          VARCHAR(191)     NOT NULL COMMENT 'A known page (ids replaced by *), or /other',
  visitor_hash  CHAR(64)         NOT NULL COMMENT 'HMAC with a salt deleted after the day; not linkable across days',
  signed_in     TINYINT(1)       NOT NULL DEFAULT 0,
  referrer_host VARCHAR(100)     NULL     COMMENT 'Other site the visitor came from (host only)',
  created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_page_views_day (day),
  KEY ix_page_views_day_visitor (day, visitor_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE daily_visits (
  day               DATE         NOT NULL,
  visitors          INT UNSIGNED NOT NULL DEFAULT 0,
  views             INT UNSIGNED NOT NULL DEFAULT 0,
  signed_in_visitors INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
