-- =============================================================================
-- Phase 2 — authentication support.
-- session_version is copied into each PHP session at sign-in; bumping it
-- (password reset / change, account disabled) invalidates every other session.
-- =============================================================================

ALTER TABLE users
  ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 1 AFTER status;
