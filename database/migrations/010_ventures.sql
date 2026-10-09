-- =============================================================================
-- Transenigma ventures (owner request 2026-10-09), from the old site's menu:
-- Products: Evolve Institute, Institute of Life Semantics (ILS);
-- Social Service: India Tribal Care.
-- Their old websites (evolveinstitute.in, ils.transenigma.in, indiatribalcare.com)
-- no longer resolve, so they are listed without a link until a live address exists.
-- =============================================================================

CREATE TABLE ventures (
  id           INT UNSIGNED                NOT NULL AUTO_INCREMENT,
  slug         VARCHAR(80)                 NOT NULL,
  name         VARCHAR(160)                NOT NULL,
  short_name   VARCHAR(40)                 NULL,
  kind         ENUM('product','social')    NOT NULL,
  description  TEXT                        NULL,
  url          VARCHAR(500)                NULL,
  sort_order   SMALLINT UNSIGNED           NOT NULL DEFAULT 0,
  is_published TINYINT(1)                  NOT NULL DEFAULT 1,
  updated_at   DATETIME                    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_ventures_slug (slug),
  KEY ix_ventures_published_order (is_published, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ventures (slug, name, short_name, kind, description, url, sort_order) VALUES
('evolve-institute', 'Evolve Institute', NULL, 'product', NULL, NULL, 1),
('institute-of-life-semantics', 'Institute of Life Semantics', 'ILS', 'product', NULL, NULL, 2),
('india-tribal-care', 'India Tribal Care', NULL, 'social', NULL, NULL, 3);
