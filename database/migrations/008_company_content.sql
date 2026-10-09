-- =============================================================================
-- Transenigma company content (slice S5, owner decisions 2026-10-09):
-- Our Team, TERF research publications and consultancy projects.
-- Workshops were dropped by the owner, so there are no workshop tables.
-- Data is seeded by 009_company_content_seed.sql.
-- =============================================================================

CREATE TABLE team_members (
  id           INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  name         VARCHAR(120)      NOT NULL,
  role         VARCHAR(160)      NOT NULL,
  credentials  TEXT              NOT NULL COMMENT 'One credential per line',
  photo        VARCHAR(255)      NULL     COMMENT 'Path under the site root, e.g. /images/team/x.webp',
  sort_order   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_published TINYINT(1)        NOT NULL DEFAULT 1,
  updated_at   DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_team_published_order (is_published, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE research_categories (
  id           INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(80)       NOT NULL COMMENT 'Anchor on /research, e.g. /research#drug-discovery',
  name         VARCHAR(160)      NOT NULL,
  sort_order   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_published TINYINT(1)        NOT NULL DEFAULT 1,
  updated_at   DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_research_categories_slug (slug),
  KEY ix_research_categories_order (is_published, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE publications (
  id           INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  category_id  INT UNSIGNED      NOT NULL,
  citation     TEXT              NOT NULL COMMENT 'Full reference as published on the old site',
  year         SMALLINT UNSIGNED NULL,
  url          VARCHAR(500)      NULL,
  sort_order   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_published TINYINT(1)        NOT NULL DEFAULT 1,
  updated_at   DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_publications_category (category_id, is_published, sort_order),
  CONSTRAINT fk_publications_category FOREIGN KEY (category_id) REFERENCES research_categories (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE consultancy_groups (
  id           INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(80)       NOT NULL,
  name         VARCHAR(160)      NOT NULL,
  tagline      VARCHAR(255)      NOT NULL DEFAULT '',
  sort_order   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_consultancy_groups_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Only projects whose website works are listed with a url; projects that never
-- had a website (and upcoming products) are listed without one. Projects whose
-- website no longer works are not listed at all (owner rule, 2026-10-09).
CREATE TABLE consultancy_projects (
  id           INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  group_id     INT UNSIGNED      NOT NULL,
  slug         VARCHAR(80)       NOT NULL,
  name         VARCHAR(160)      NOT NULL,
  description  TEXT              NOT NULL,
  image        VARCHAR(255)      NULL,
  url          VARCHAR(500)      NULL,
  sort_order   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_published TINYINT(1)        NOT NULL DEFAULT 1,
  updated_at   DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_consultancy_projects_slug (slug),
  KEY ix_consultancy_projects_group (group_id, is_published, sort_order),
  CONSTRAINT fk_consultancy_projects_group FOREIGN KEY (group_id) REFERENCES consultancy_groups (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
