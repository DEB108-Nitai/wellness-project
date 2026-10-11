-- =============================================================================
-- Registered office address and CIN for the footer and Contact page
-- (owner-supplied, 2026-10-11). No phone number is published, by owner decision.
-- Editable later in admin Settings.
-- =============================================================================

INSERT INTO settings (setting_key, value) VALUES
  ('company_address', '863 P Block, Opposite Ideal Exotica, New Alipore, Kolkata 700053'),
  ('company_cin', 'U74999WB2017PTC219904')
ON DUPLICATE KEY UPDATE value = IF(value = '', VALUES(value), value);
