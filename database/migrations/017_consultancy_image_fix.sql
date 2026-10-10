-- =============================================================================
-- Consultancy image fix (slice S8, 2026-10-10).
-- The old site's image for the Depression Prediction Engine includes a noose and
-- people in distress. That is suicide imagery, which is inappropriate beside a
-- mental-health product. The card shows a neutral abstract panel until the owner
-- supplies a replacement image.
-- =============================================================================

UPDATE consultancy_projects SET image = NULL WHERE slug = 'depression-prediction';
