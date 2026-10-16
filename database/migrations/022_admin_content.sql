-- Phase 5 slice A: research papers and consultancy projects are managed from the admin console.
-- * publications.created_at: when a paper was added (admin "recently added"; existing rows get this
--   migration's time).
-- * consultancy_projects.client_name: the client shown in "Clients and partners" on /consultancy, which was
--   a hard-coded list in the frontend. Upcoming products have none.

ALTER TABLE publications
  ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER is_published;

ALTER TABLE consultancy_projects
  ADD COLUMN client_name VARCHAR(120) NULL AFTER name;

UPDATE consultancy_projects SET client_name = CASE slug
  WHEN 'salpg' THEN 'SALPG'
  WHEN 'mjunction' THEN 'Mjunction (TATA-SAIL)'
  WHEN 'oil-india' THEN 'Oil India'
  WHEN 'iskcon-kolkata' THEN 'ISKCON Kolkata'
  WHEN 'kolkata-ventures' THEN 'Kolkata Ventures'
  WHEN 'annamrita' THEN 'Annamrita'
  WHEN 'cqt-quantum-optics' THEN 'Centre for Quantum Technologies, NUS'
  WHEN 'brainwave-science' THEN 'Brainwave Science'
  WHEN 'yogavihara' THEN 'Yogavihara'
  ELSE client_name
END;
