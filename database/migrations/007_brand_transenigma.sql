-- =============================================================================
-- Rebrand Wellness → Transenigma — owner decision 2026-10-08.
-- The site becomes the Transenigma Pvt Ltd company website.
-- =============================================================================

-- Only replace the old default; keep a name an admin has already customised.
UPDATE settings SET value = 'Transenigma'
WHERE setting_key = 'site_name' AND value = 'Wellness';

UPDATE faqs SET
  answer = 'No. The Transenigma 16PF assessment is an educational, self-development and wellbeing tool. It is not intended to diagnose or treat any psychiatric or psychological condition.'
WHERE question = 'Is this a clinical or medical diagnosis?'
  AND answer LIKE 'No. Wellness is %';
