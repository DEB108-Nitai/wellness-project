-- =============================================================================
-- Punctuation fix (owner request 2026-10-10): a title ending in "?" was followed
-- by a stray full stop ("…Happiness States?. In …"), copied from the old site.
-- =============================================================================

UPDATE publications
SET citation = REPLACE(citation, 'Happiness States?. In ', 'Happiness States? In ')
WHERE citation LIKE '%Which Acts Model Transitions Between Different Happiness States?. In %';
