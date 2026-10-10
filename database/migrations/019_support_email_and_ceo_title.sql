-- =============================================================================
-- Owner decisions (2026-10-10):
-- * Public support email: support@transenigma.com. The Contact page and the
--   footer show it, and it stays editable in admin Settings.
-- * Dr. Mayank Bhasin's title: "CEO and Founder".
-- =============================================================================

UPDATE settings SET value = 'support@transenigma.com' WHERE setting_key = 'support_email' AND value = '';

UPDATE team_members SET role = 'CEO and Founder' WHERE name = 'Dr. Mayank Bhasin' AND role = 'Chief Executive Officer';
