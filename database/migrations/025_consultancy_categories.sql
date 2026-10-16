-- Phase 5 (owner request 2026-10-12): admins manage consultancy categories (add, rename, reorder, delete when
-- empty), like research categories. Which projects count as client work used to be fixed to the "upcoming"
-- section; each category now says it itself:
--   clients  = client work: counted on the home page, client names listed under "Clients and partners";
--   products = our own products in development: shown with an "In development" label, not counted.

ALTER TABLE consultancy_groups
  ADD COLUMN kind ENUM('clients','products') NOT NULL DEFAULT 'clients' AFTER tagline;

UPDATE consultancy_groups SET kind = 'products' WHERE slug = 'upcoming';
