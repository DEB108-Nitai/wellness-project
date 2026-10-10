-- =============================================================================
-- Publication year fix (owner request 2026-10-10).
-- "Selective Chemical Substitution of Cu in the Structure of TiAl3 Type InPd3"
-- was seeded without a year. It was published in European Journal of Inorganic
-- Chemistry, 2022 (DOI 10.1002/ejic.202200309). Set the year, add it to the
-- citation in the same style as the others, and move the paper after the other
-- 2022 papers in its category (newest first).
-- =============================================================================

SET @cat := (SELECT id FROM research_categories WHERE slug = 'materials-science-computational-materials');

UPDATE publications
SET sort_order = sort_order + 1
WHERE category_id = @cat AND (year IS NULL OR year < 2022)
  AND citation NOT LIKE '%Selective Chemical Substitution of Cu in the Structure of TiAl3 Type InPd3%';

UPDATE publications
SET year = 2022,
    citation = REPLACE(citation, 'Jana, P.P. Selective Chemical Substitution', 'Jana, P.P., 2022. Selective Chemical Substitution'),
    sort_order = (SELECT n FROM (SELECT MAX(sort_order) + 1 AS n FROM publications WHERE category_id = @cat AND year >= 2022) AS t)
WHERE category_id = @cat
  AND citation LIKE '%Selective Chemical Substitution of Cu in the Structure of TiAl3 Type InPd3%';
