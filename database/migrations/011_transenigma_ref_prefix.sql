-- =============================================================================
-- Rename Wellness → Transenigma in code (owner decision 2026-10-09):
-- assessment result codes change prefix from WL- to TE- (same 6-character body).
-- Existing codes are converted so results and their audit trail keep matching.
-- =============================================================================

UPDATE test_sessions
SET public_ref = CONCAT('TE-', SUBSTRING(public_ref, 4))
WHERE public_ref LIKE 'WL-%';

UPDATE audit_logs
SET entity_id = CONCAT('TE-', SUBSTRING(entity_id, 4))
WHERE entity_type = 'test_session' AND entity_id LIKE 'WL-%';
