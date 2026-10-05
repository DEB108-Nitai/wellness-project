-- =============================================================================
-- Phase 4 — third 60-day program: PTI (Philosophical Therapeutic Intervention).
-- Reference codes: STI-60-XXXXXX / TTI-60-XXXXXX / PTI-60-XXXXXX.
-- =============================================================================

ALTER TABLE challenge_registrations
  MODIFY COLUMN program ENUM('STI','TTI','PTI') NOT NULL;
