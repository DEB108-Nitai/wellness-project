-- =============================================================================
-- Publication links (owner request 2026-10-10).
-- Each link was verified against an authoritative record before being added:
--   * DOIs: found in Crossref (the DOI registry). The title, every author and the
--     year matched the citation, and the DOI resolves at doi.org. One DOI was also
--     checked on the publisher's page: Crossref lists only 2 of the 3 authors of
--     10.32604/cmc.2024.042752, but the publisher's page lists all 3.
--   * Non-DOI links: the institution's own page (Walden University ScholarWorks,
--     CESNUR conference site) shows the same title and author.
-- Papers with no verifiable record (mostly conference presentations, and journals
-- without DOIs) keep url = NULL. Rows are matched by title text, not id.
-- =============================================================================

-- Happiness & affect states
UPDATE publications SET url = 'https://doi.org/10.1007/978-3-032-14107-1_36'
WHERE citation LIKE '%Which Acts Model Transitions Between Different Happiness States%';
UPDATE publications SET url = 'https://doi.org/10.1145/3487351.3489475'
WHERE citation LIKE '%Which acts model happiness? an exploratory analysis on Twitter and Goodreads%';

-- Drug discovery
UPDATE publications SET url = 'https://doi.org/10.1007/978-3-032-13509-4_12'
WHERE citation LIKE '%De Novo Drug Design for Antipsychotics%';

-- Vasudev Das: journals and proceedings with DOIs
UPDATE publications SET url = 'https://doi.org/10.33422/3rd.icrbme.2020.11.115'
WHERE citation LIKE '%De-escalation strategies for COVID-19 financial fraud%';
UPDATE publications SET url = 'https://doi.org/10.1108/jfc-03-2020-0036'
WHERE citation LIKE '%De-escalation strategies for kleptocracy in Nigeria_s oil sector%';
UPDATE publications SET url = 'https://doi.org/10.33422/conferenceme.2019.11.655'
WHERE citation LIKE '%De-escalation strategies for kleptocracy in Nigeria_s oil industry%';
UPDATE publications SET url = 'https://doi.org/10.1108/jfc-08-2016-0053'
WHERE citation LIKE '%(2018a). Kleptocracy in Nigeria.%';
UPDATE publications SET url = 'https://doi.org/10.1108/jmlc-02-2017-0006'
WHERE citation LIKE '%Legislative kleptocracy in Nigeria: Systems approach%';
UPDATE publications SET url = 'https://doi.org/10.1108/jfc-02-2017-0011'
WHERE citation LIKE '%Judicial corruption: The case of Nigeria%';

-- Vasudev Das: institutional pages
UPDATE publications SET url = 'https://scholarworks.waldenu.edu/dissertations/8692'
WHERE citation LIKE '%Succession planning strategies in faith-based nonprofits%';
UPDATE publications SET url = 'https://www.cesnur.org/2006/sd_das.htm'
WHERE citation LIKE '%Resolving religious crisis for sustainable democracy in Nigeria%';

-- Materials science & computational materials
UPDATE publications SET url = 'https://doi.org/10.32604/cmc.2024.042752'
WHERE citation LIKE '%Intelligent Design of High Strength and High Conductivity Copper Alloys%';
UPDATE publications SET url = 'https://doi.org/10.1021/acs.inorgchem.3c00428'
WHERE citation LIKE '%Ni3InSb: Synthesis, Crystal Structure%';
UPDATE publications SET url = 'https://doi.org/10.1002/zaac.202100354'
WHERE citation LIKE '%Unique Coloring Scheme of the%Brass Type Phase%';
UPDATE publications SET url = 'https://doi.org/10.1515/zkri-2022-0008'
WHERE citation LIKE '%Formation and stability of Rh2Cd5%';
UPDATE publications SET url = 'https://doi.org/10.1016/j.jssc.2022.123223'
WHERE citation LIKE '%Hydrogen storage properties of ternary ordered cubic Laves phase Cu3Cd2In%';
UPDATE publications SET url = 'https://doi.org/10.1016/j.jssc.2022.123283'
WHERE citation LIKE '%phase stability of the Cu2%pseudo-binary Laves phases%';
UPDATE publications SET url = 'https://doi.org/10.1002/ejic.202200309'
WHERE citation LIKE '%Selective Chemical Substitution of Cu in the Structure of TiAl3 Type InPd3%';
UPDATE publications SET url = 'https://doi.org/10.1016/j.solidstatesciences.2021.106544'
WHERE citation LIKE '%chemical bonding of A3Pd5%';
UPDATE publications SET url = 'https://doi.org/10.1002/ejic.202100064'
WHERE citation LIKE '%Catalytic Properties of Ni3GaSb%';
UPDATE publications SET url = 'https://doi.org/10.1021/acs.inorgchem.0c03208'
WHERE citation LIKE '%A Vacancy-Driven Intermetallic Phase: Rh3Cd5%';
UPDATE publications SET url = 'https://doi.org/10.1515/zkri-2021-2019'
WHERE citation LIKE '%atomic ordering in the ternary Rh5Ga2As%';
UPDATE publications SET url = 'https://doi.org/10.1016/j.jssc.2021.122560'
WHERE citation LIKE '%Hydrogen storage properties of hexagonal C14 Laves phase Cu2Cd%';

-- Software engineering
UPDATE publications SET url = 'https://doi.org/10.1016/j.jss.2006.01.009'
WHERE citation LIKE '%Distributed dynamic slicing of Java programs%';
