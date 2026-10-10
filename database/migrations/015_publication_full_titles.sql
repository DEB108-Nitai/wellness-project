-- =============================================================================
-- Full titles and journals (owner request 2026-10-10).
-- Five materials-science citations copied from the old site had truncated titles
-- and no journal. Titles, journals, volumes and pages come from each paper's
-- Crossref record (DOIs in 013). The citation style matches the others
-- (Harvard). One correction: the publisher's record spells "strucural", and this
-- is written as "structural".
-- =============================================================================

UPDATE publications
SET citation = 'Roy, N., Kuila, S.K., Harshit, Pramanik, P. and Jana, P.P., 2022. Selective Chemical Substitution of Cu in the Structure of TiAl3 Type InPd3: Experimental and Theoretical Studies. European Journal of Inorganic Chemistry, 2022(26), p.e202200309.'
WHERE citation LIKE '%Selective Chemical Substitution of Cu in the Structure of TiAl3 Type InPd3.';

UPDATE publications
SET citation = 'Roy, N., Koley, B., Harshit and Jana, P.P., 2022. Formation and stability of Rh2Cd5 and its structural correlation with RhCd and Rh3Cd5−δ (δ ∼ 0.56). Zeitschrift für Kristallographie - Crystalline Materials, 237(6-7), pp.233-238.'
WHERE citation LIKE '%Formation and stability of Rh2Cd5.';

UPDATE publications
SET citation = 'Roy, N., Harshit and Jana, P.P., 2022. Hydrogen storage properties of ternary ordered cubic Laves phase Cu3Cd2In: Electronic structure and bonding approach. Journal of Solid State Chemistry, 312, p.123223.'
WHERE citation LIKE '%Hydrogen storage properties of ternary ordered cubic Laves phase Cu3Cd2In.';

UPDATE publications
SET citation = 'Roy, N., Giri, S., Harshit and Jana, P.P., 2021. Site preference and atomic ordering in the ternary Rh5Ga2As: first-principles calculations. Zeitschrift für Kristallographie - Crystalline Materials, 236(5-7), pp.147-154.'
WHERE citation LIKE '%Site preference and atomic ordering in the ternary Rh5Ga2As.';

UPDATE publications
SET citation = 'Roy, N., Kumari, S., Harshit, Jana, P.P. and Deshpande, P.A., 2021. Hydrogen storage properties of hexagonal C14 Laves phase Cu2Cd: A DFT study. Journal of Solid State Chemistry, 304, p.122560.'
WHERE citation LIKE '%Hydrogen storage properties of hexagonal C14 Laves phase Cu2Cd.';
