-- =============================================================================
-- Company LinkedIn page for the footer (owner-supplied, 2026-10-10).
-- Editable later in admin Settings ("Company LinkedIn page").
-- =============================================================================

INSERT INTO settings (setting_key, value) VALUES ('linkedin_url', 'https://www.linkedin.com/company/transenigma/')
ON DUPLICATE KEY UPDATE value = IF(value = '', VALUES(value), value);
