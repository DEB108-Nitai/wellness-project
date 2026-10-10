-- =============================================================================
-- Seed: Transenigma company content (slice S5). Generated once from the old
-- transenigma.com pages (2026-10-09); this file is now the source of truth.
--
-- Corrections made while importing (spelling only, no facts changed):
--   * Category "Vedic Pyschology" -> "Vedic Psychology"
--   * Citation "Legislative fraud...": removed the duplicated words "Presented approach."
--   * Citation "Sonic therapeutic intervention and self-control": "Rothak" -> "Rohtak"
--   * Consultancy: "accelarate", "persistance", "Dalmiah", "Regior", "internaltional",
--     "Execellence", "Dirchlet" corrected; Oil India "Enterprise in one" -> "Enterprise and one".
--
-- Consultancy link check (owner rule: drop projects whose website no longer works,
-- keep projects that never had a website, keep upcoming products):
--   kept with working link : SALPG, Mjunction (now https://www.mjunction.in/), Yogavihara,
--                            Kolkata Ventures, Oil India, ISKCON Kolkata, Annamrita
--   kept, never had a link : Brainwave Science, CQT Quantum Optics Lab, 2 upcoming products
--   dropped (dead link)    : Tour Mayapur (no response), Aiwa (domain gone), Pongworks (404)
-- =============================================================================

-- Our Team (the 6 people from the old homepage, in its order)
INSERT INTO team_members (name, role, credentials, photo, sort_order) VALUES
('Dr. Vasudev Das', 'Chief Vision & Strategy Officer', 'Management Science Researcher
PhD, Applied Management & Decision Sciences
Walden University', '/images/team/vasudev-das.webp', 1),
('Dr. Mayank Bhasin', 'Chief Executive Officer', 'Joint PhD, University of Melbourne – IIT Kharagpur
Researcher – Behavioural Analytics, Nano Chemistry, AI', '/images/team/mayank-bhasin.webp', 2),
('Dr. Deepshikha Singh', 'Chief Administrative Officer', 'MD, Ophthalmology', '/images/team/deepshikha-singh.webp', 3),
('Dr. Harshit', 'Tech Lead AI-ML', 'PhD, IIT Kharagpur
Researcher – Behavioural Analytics, Quantum Chemistry, AI', '/images/team/harshit.webp', 4),
('Praveen Kumar Killaka', 'Chief Designer – Front End, UI/UX Animator', 'M.Tech., IIT Kharagpur', '/images/team/praveen-kumar-killaka.webp', 5),
('Gulshan Chandrakar', 'Lead – Full Stack Development', 'M.Tech., IIT Kharagpur', '/images/team/gulshan-chandrakar.webp', 6);

-- TERF research: 15 categories, 97 publications (newest first within each category)
INSERT INTO research_categories (slug, name, sort_order) VALUES
('happiness-affect-states', 'Happiness & Affect States', 1),
('drug-discovery', 'Drug Discovery', 2),
('sankhya-vedic-psychology-ayurveda', 'Sankhya, Vedic Psychology & Ayurveda', 3),
('leadership-management-organizational-change', 'Leadership, Management & Organizational Change', 4),
('governance-corruption-ethics-public-policy', 'Governance, Corruption, Ethics & Public Policy', 5),
('trust-ethics-character-moral-leadership', 'Trust, Ethics, Character & Moral Leadership', 6),
('spirituality-consciousness-vedanta-indian-knowledge-systems', 'Spirituality, Consciousness, Vedanta & Indian Knowledge Systems', 7),
('religion-peacebuilding-conflict-resolution', 'Religion, Peacebuilding & Conflict Resolution', 8),
('women-gender-social-transformation', 'Women, Gender & Social Transformation', 9),
('education-learning-human-development', 'Education, Learning & Human Development', 10),
('democracy-nation-building-socio-political-development', 'Democracy, Nation Building & Socio-Political Development', 11),
('sexuality-celibacy-social-ethics', 'Sexuality, Celibacy & Social Ethics', 12),
('vaisnava-studies-iskcon-faith-based-social-impact', 'Vaisnava Studies, ISKCON & Faith-based Social Impact', 13),
('materials-science-computational-materials', 'Materials Science & Computational Materials', 14),
('computer-science-software-engineering', 'Computer Science & Software Engineering', 15);

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Bhasin, M. and Harshit, 2025, August. Which Acts Model Transitions Between Different Happiness States?. In International Conference on Advances in Social Networks Analysis and Mining (pp. 445-455). Cham: Springer Nature Switzerland.' AS citation, 2025 AS year, NULL AS url, 1 AS sort_order
  UNION ALL SELECT 'Bhasin, M., Harshit and Goyal, P., 2021, November. Which acts model happiness? an exploratory analysis on Twitter and Goodreads. In Proceedings of the 2021 IEEE/ACM International Conference on Advances in Social Networks Analysis and Mining (pp. 577-584).' AS citation, 2021 AS year, NULL AS url, 2 AS sort_order
) AS v WHERE c.slug = 'happiness-affect-states';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Harshit, Bhasin, M. (2026). De Novo Drug Design for Antipsychotics: A Case Study with Llama 3.2 1B. In: Karampelas, P., Day, MY., Ting, IH., Alhajj, R. (eds) Advances in Social Networks Analysis and Mining. ASONAM 2025. Lecture Notes in Social Networks. Springer, Cham.' AS citation, 2026 AS year, NULL AS url, 1 AS sort_order
) AS v WHERE c.slug = 'drug-discovery';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Das, V. (2024, November). Presidential sex scandals: A sonic therapeutic intervention approach. Presented at the 10th International Conference on Business, Management, and Economics, November 22-24, 2024, London, United Kingdom.' AS citation, 2024 AS year, NULL AS url, 1 AS sort_order
  UNION ALL SELECT 'Das, V. (2024, September). Women leadership sex scandals in the education industry: Sonic therapeutic intervention approach. Presented at the International Conference on Leadership, Culture, and Talent Management, September 27-29, Paris, France.' AS citation, 2024 AS year, NULL AS url, 2 AS sort_order
  UNION ALL SELECT 'Das, V. (2024, August). Sex scandals in defense leadership: Sonic therapeutic intervention approach. Presented at the 8th International Conference on Management and Economics, August 23-25, Oxford, United Kingdom.' AS citation, 2024 AS year, NULL AS url, 3 AS sort_order
  UNION ALL SELECT 'Das, V. (2024, August). Sex scandals in women’s leadership: Sonic therapeutic intervention approach. Presented at the 8th International Conference on Management and Economics, August 23-25, Oxford, United Kingdom.' AS citation, 2024 AS year, NULL AS url, 4 AS sort_order
  UNION ALL SELECT 'Das, V. (2024, August). Legislative fraud: A sonic therapeutic intervention approach. Presented at the 8th International Conference on Management and Economics, August 23-25, Oxford, United Kingdom.' AS citation, 2024 AS year, NULL AS url, 5 AS sort_order
  UNION ALL SELECT 'Das, V. (2024, July). Congressional sex scandals: A sonic therapeutic intervention approach. Presented at the 1st International Conference on Management and Business (ICMBCONF), July 19-21, 2024, King’s College London, United Kingdom.' AS citation, 2024 AS year, NULL AS url, 6 AS sort_order
  UNION ALL SELECT 'Das, V. (2024, March). Sonic therapeutic intervention for preventing leadership sex scandals. Presented at the 11th International Conference on Applied Research in Management, Economics, and Accounting, March 27-29, Oxford, United Kingdom.' AS citation, 2024 AS year, NULL AS url, 7 AS sort_order
  UNION ALL SELECT 'Das, V. (2023, December). Sonic therapeutic intervention for kleptocracy de-escalation: A hermeneutic phenomenological study. Presented at the 8th International Conference on Research in Management and Economics, December 15-17, Cambridge, United Kingdom.' AS citation, 2023 AS year, NULL AS url, 8 AS sort_order
  UNION ALL SELECT 'Das, V. (2021, June). Understanding the Value of Sonic Therapeutic Intervention in Fraud Prevention. Presented at ICFCPC001 2021: XV. International Conference on Financial Crime Prevention and Control, June 28-29, 2021, London, United Kingdom.' AS citation, 2021 AS year, NULL AS url, 9 AS sort_order
  UNION ALL SELECT 'Das, V. (2021). Sonic therapeutic intervention for preventing financial fraud: A phenomenological study. International Journal of Mechanical and Industrial Engineering, 15(9), 822 – 829.' AS citation, 2021 AS year, 'https://publications.waset.org/10012222/sonic-therapeutic-intervention-for-preventing-financial-fraud-a-phenomenological-study' AS url, 10 AS sort_order
  UNION ALL SELECT 'Das, V. (2013, May). Sonic therapeutic intervention and self-control. Paper presented at Pandit Bhagwat Dayal Sharma University of Health Sciences, Rohtak, India.' AS citation, 2013 AS year, NULL AS url, 11 AS sort_order
) AS v WHERE c.slug = 'sankhya-vedic-psychology-ayurveda';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Das, V. (2025, July). Leading change in a multigenerational corporation. Keynote speaker, at the 2nd International Conference on Leadership, Culture, and Talent Management, July 25-27, 2025, Copenhagen, Denmark.' AS citation, 2025 AS year, NULL AS url, 1 AS sort_order
  UNION ALL SELECT 'Das, V. (2025, March). Leadership trust strategies for change management. Presented at the 8th International Conference on Business, Management, and Finance, March 27-29, 2025, Oxford, United Kingdom.' AS citation, 2025 AS year, NULL AS url, 2 AS sort_order
  UNION ALL SELECT 'Das, V. (2022). Strategies for transformative change in the post-pandemic era. Presented at the 5th International Conference on Research in Business, Management, and Economics, 8-10 April 2022, Paris, France.' AS citation, 2022 AS year, NULL AS url, 3 AS sort_order
  UNION ALL SELECT 'Das, V. (2020b). Succession planning strategies in faith-based nonprofits: A comparative case study (Publication No. 27542827) [Doctoral dissertation, Walden University]. PQDT Open.' AS citation, 2020 AS year, NULL AS url, 4 AS sort_order
  UNION ALL SELECT 'Das, V. (2019). Comparative study of Kotter’s and Hiatt’s (ADKAR) change models. Journal of Leadership and Management, 1(15), 263-271.' AS citation, 2019 AS year, NULL AS url, 5 AS sort_order
  UNION ALL SELECT 'Das, V. (2018d). Comparative study of Kotter’s and Hiatt’s (ADKAR) change models. In A. Szpaderski and M. J. Urick (Eds.), Essential principles for managers: Innovative approaches to examining foundational theories of management and leadership (pp. 83-102).' AS citation, 2018 AS year, NULL AS url, 6 AS sort_order
  UNION ALL SELECT 'Das, V. (2011, April). Self-control and organizational leadership. Paper presented at the Faculty of Management Conference, University of South Africa (UNISA), Johannesburg, South Africa.' AS citation, 2011 AS year, NULL AS url, 7 AS sort_order
  UNION ALL SELECT 'Das, V. (2009, February). Synergic thinking approach to spirituality-based organizational leadership for social transformation. Paper presented at the 2nd International Conference on Integrating Spirituality and Organizational Leadership, University of Pondicherry, Pondicherry, India.' AS citation, 2009 AS year, NULL AS url, 8 AS sort_order
  UNION ALL SELECT 'Das, V. (2009). Synergic thinking approach to spirituality oriented organizational leadership, Sunita Singh-Gupta (Ed.), Integrating Spirituality and Organizational Leadership, 1(3), (pp. 649-665).' AS citation, 2009 AS year, NULL AS url, 9 AS sort_order
  UNION ALL SELECT 'Das, V. (2008, July). Are followers about to get their due? Presentation at Harvard Business School Working Knowledge Seminar, Boston, Massachusetts, USA.' AS citation, 2008 AS year, NULL AS url, 10 AS sort_order
  UNION ALL SELECT 'Das, V. (2008, June). Why don’t managers think deeply? Presentation at Harvard Business School Working Knowledge Seminar, Boston, Massachusetts, USA.' AS citation, 2008 AS year, NULL AS url, 11 AS sort_order
  UNION ALL SELECT 'Das, V. (2008, December). Does judgement trump experience? Presentation at Harvard Business School Working Knowledge Seminar, Boston, Massachusetts, USA.' AS citation, 2008 AS year, NULL AS url, 12 AS sort_order
  UNION ALL SELECT 'Das, V. (2005, March). Synergic thinking approach to leadership and the role of belief system in national reformation. Paper presented at the 34th North Carolina Political Science Association annual conference, University of North Carolina at Pembroke, USA.' AS citation, 2005 AS year, NULL AS url, 13 AS sort_order
) AS v WHERE c.slug = 'leadership-management-organizational-change';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Das, V. (2025, March). Preventive strategies for octogenarian gerontocracy. Presented at the 8th International Conference on Business, Management, and Finance, March 27-29, 2025, Oxford, United Kingdom.' AS citation, 2025 AS year, NULL AS url, 1 AS sort_order
  UNION ALL SELECT 'Das, V. (2025, March). Preventive strategies for heropreneurship. Presented at the 8th International Conference on Business, Management, and Finance, March 27-29, 2025, Oxford, United Kingdom.' AS citation, 2025 AS year, NULL AS url, 2 AS sort_order
  UNION ALL SELECT 'Das, V. (2025). De-escalation strategies for felonocracy. Presented at the 8th International Conference on Business, Management, and Finance, March 27-29, 2025, Oxford, United Kingdom.' AS citation, 2025 AS year, NULL AS url, 3 AS sort_order
  UNION ALL SELECT 'Das, V. (2024, November). De-escalation strategies for judicial leadership corruption. Presented at the 10th International Conference on Business, Management, and Economics, November 22-24, 2024, London, United Kingdom.' AS citation, 2024 AS year, NULL AS url, 4 AS sort_order
  UNION ALL SELECT 'Das, V. (2020, November). De-escalation strategies for COVID-19 financial fraud. Presented at the 3rd International Conference on Research in Business, Management, and Economics, 27-29 November 2020, Dublin, Republic of Ireland.' AS citation, 2020 AS year, NULL AS url, 5 AS sort_order
  UNION ALL SELECT 'Das, V. (2020a). De-escalation strategies for kleptocracy in Nigeria’s oil sector. Journal of Financial Crime, 27(3).' AS citation, 2020 AS year, NULL AS url, 6 AS sort_order
  UNION ALL SELECT 'Das, V. (2019a, November). De-escalation strategies for kleptocracy in Nigeria’s oil industry. Presented at the International Academic Conference on Management and Economics, Oxford, United Kingdom.' AS citation, 2019 AS year, NULL AS url, 7 AS sort_order
  UNION ALL SELECT 'Das, V. (2018a). Kleptocracy in Nigeria. Journal of Financial Crime, 25(1), 57-69.' AS citation, 2018 AS year, NULL AS url, 8 AS sort_order
  UNION ALL SELECT 'Das, V. (2018b). Legislative kleptocracy in Nigeria: Systems approach. Journal of Money Laundering Control, 21(2), 134-148.' AS citation, 2018 AS year, NULL AS url, 9 AS sort_order
  UNION ALL SELECT 'Das, V. (2018c). Judicial corruption: The case of Nigeria. Journal of Financial Crime, 25(4), 926-939.' AS citation, 2018 AS year, NULL AS url, 10 AS sort_order
  UNION ALL SELECT 'Das, V. (2005, October). Endogenous and exogenous factors affecting probity in governance in sub-Sahara Africa. Paper presented at the International Studies Association (ISA – West) Annual Conference, Las Vegas, Nevada.' AS citation, 2005 AS year, NULL AS url, 11 AS sort_order
  UNION ALL SELECT 'Das, V. (2004b, November). Kleptomaniacs and Nigeria’s political destiny. Paper presented at Georgia Political Science Association annual conference, Savannah, Georgia.' AS citation, 2004 AS year, NULL AS url, 12 AS sort_order
  UNION ALL SELECT 'Das, V. (2003a). Lawmakers and corruption: Sonic therapeutic approach. Journal of Curriculum and Instruction, 11(2), 88-92.' AS citation, 2003 AS year, NULL AS url, 13 AS sort_order
  UNION ALL SELECT 'Das, V. (2003b). Endogenous and exogenous factors affecting probity in governance. Journal of Research and Production, 3(2), 45-52.' AS citation, 2003 AS year, NULL AS url, 14 AS sort_order
  UNION ALL SELECT 'Das, V. (2001d). Kleptomaniacs and Nigeria’s political destiny. Journal of Curriculum and Instruction, 10(5), 37-40.' AS citation, 2001 AS year, NULL AS url, 15 AS sort_order
) AS v WHERE c.slug = 'governance-corruption-ethics-public-policy';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Das, V. (2025, March). Strategies for preventing genderwashing leadership: A phenomenological study.' AS citation, 2025 AS year, NULL AS url, 1 AS sort_order
  UNION ALL SELECT 'Das, V. (2012, July). Why is trust so hard to achieve in management?' AS citation, 2012 AS year, NULL AS url, 2 AS sort_order
  UNION ALL SELECT 'Das, V. (2011, May). How ethical can we be?' AS citation, 2011 AS year, NULL AS url, 3 AS sort_order
  UNION ALL SELECT 'Das, V. (2011, April). Blind spots: We are not as ethical as we think.' AS citation, 2011 AS year, NULL AS url, 4 AS sort_order
  UNION ALL SELECT 'Das, V. (2006, April). Self-restraint and Nigeria’s development: An ethical inquiry.' AS citation, 2006 AS year, NULL AS url, 5 AS sort_order
  UNION ALL SELECT 'Das, V. (2006, March). Self-restraint and national development.' AS citation, 2006 AS year, NULL AS url, 6 AS sort_order
  UNION ALL SELECT 'Das, V. (2000a). Transmuting bestial culture: Lawmakers and character development.' AS citation, 2000 AS year, NULL AS url, 7 AS sort_order
) AS v WHERE c.slug = 'trust-ethics-character-moral-leadership';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Das, V. (2008, May). Strategies for awakening planetary consciousness: Towards a terror free social order.' AS citation, 2008 AS year, NULL AS url, 1 AS sort_order
  UNION ALL SELECT 'Das, V. (2008, April). Presidency and requital epistemology: Vedantic perspective.' AS citation, 2008 AS year, NULL AS url, 2 AS sort_order
  UNION ALL SELECT 'Das, V. (2008, December). Vedantic views on planetary consciousness.' AS citation, 2008 AS year, NULL AS url, 3 AS sort_order
  UNION ALL SELECT 'Das, V. (2002a). Vedantic views on religious transmogrification: A stimulus for national unity.' AS citation, 2002 AS year, NULL AS url, 4 AS sort_order
  UNION ALL SELECT 'Das, V. (2002d). Presidency and requital epistemology: Lessons from an oriental culture.' AS citation, 2002 AS year, NULL AS url, 5 AS sort_order
  UNION ALL SELECT 'Das, V. (2001c). Vedantic views on cultural transformation: A stimulus for socio-political stability.' AS citation, 2001 AS year, NULL AS url, 6 AS sort_order
  UNION ALL SELECT 'Das, V. & Ifie, J.E. (2000). Karma: An exploration of parallels in Ogbia and Hare Krishna teachings.' AS citation, 2000 AS year, NULL AS url, 7 AS sort_order
  UNION ALL SELECT 'Das, V. (2000c). Intricacies of charity and implications of usurping a brahmana’s property: Lesson from Nrga.' AS citation, 2000 AS year, NULL AS url, 8 AS sort_order
  UNION ALL SELECT 'Das, V. (1999a). Theodicy: Examining negative and positive occurrences in humans.' AS citation, 1999 AS year, NULL AS url, 9 AS sort_order
) AS v WHERE c.slug = 'spirituality-consciousness-vedanta-indian-knowledge-systems';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Das, V. (2021). Understanding embryology in promoting peace leadership.' AS citation, 2021 AS year, NULL AS url, 1 AS sort_order
  UNION ALL SELECT 'Das, V. (2006, July). Resolving religious crisis for sustainable democracy in Nigeria.' AS citation, 2006 AS year, NULL AS url, 2 AS sort_order
  UNION ALL SELECT 'Das, V. (2006). Resolving religious crisis for sustainable democracy in Nigeria. Proceedings of the Center for Studies on New Religions (CESNUR) 2006 International Conference.' AS citation, 2006 AS year, NULL AS url, 3 AS sort_order
  UNION ALL SELECT 'Das, V. (2005). Mediation, ‘SPIRIT’ and adjudication: Towards effective management of conflict.' AS citation, 2005 AS year, NULL AS url, 4 AS sort_order
) AS v WHERE c.slug = 'religion-peacebuilding-conflict-resolution';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Das, V. (2015, August). Women’s empowerment and sustainability.' AS citation, 2015 AS year, NULL AS url, 1 AS sort_order
  UNION ALL SELECT 'Das, V. (2006, April). Women’s self-restraint for national transformation: Vedic approach.' AS citation, 2006 AS year, NULL AS url, 2 AS sort_order
  UNION ALL SELECT 'Das, V. (2005). Traditional practices affecting the emancipation and empowerment of women in Nigeria.' AS citation, 2005 AS year, NULL AS url, 3 AS sort_order
  UNION ALL SELECT 'Das, V. (1999b). Some Vedic anecdotes and aphorisms relevant to women education in Nigeria.' AS citation, 1999 AS year, NULL AS url, 4 AS sort_order
) AS v WHERE c.slug = 'women-gender-social-transformation';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Das, V. (2019b, November). Self-regulated learning strategies for academic achievement.' AS citation, 2019 AS year, NULL AS url, 1 AS sort_order
  UNION ALL SELECT 'Das, V. (2004a, November). Factors affecting the African child’s right to inquire.' AS citation, 2004 AS year, NULL AS url, 2 AS sort_order
  UNION ALL SELECT 'Das, V. (2004). Factors affecting the African child’s right to inquire.' AS citation, 2004 AS year, NULL AS url, 3 AS sort_order
  UNION ALL SELECT 'Das, V. (2003d). Education and self-reliance: Varnasrama approach.' AS citation, 2003 AS year, NULL AS url, 4 AS sort_order
  UNION ALL SELECT 'Das, V. (2001b). Universal basic education and self-realization: Towards intellectual transformation.' AS citation, 2001 AS year, NULL AS url, 5 AS sort_order
  UNION ALL SELECT 'Das, V. (2001e). Organismic and sociological factors affecting societal norms: Lessons from an oriental culture.' AS citation, 2001 AS year, NULL AS url, 6 AS sort_order
) AS v WHERE c.slug = 'education-learning-human-development';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Das, V. (2005a, April). The politics of social stability for sustainable democracy in Nigeria: The CCACT approach.' AS citation, 2005 AS year, NULL AS url, 1 AS sort_order
  UNION ALL SELECT 'Das, V. (2005b, April). Politics of caring thinking for economic and social reconstruction in Nigeria.' AS citation, 2005 AS year, NULL AS url, 2 AS sort_order
  UNION ALL SELECT 'Das, V. (2003e). Raw-capitalism and anti-material bankruptcy: Issues in Nigeria’s democratic future.' AS citation, 2003 AS year, NULL AS url, 3 AS sort_order
  UNION ALL SELECT 'Das, V. (2002e). Varnasrama manifesto for national integration and cohesion.' AS citation, 2002 AS year, NULL AS url, 4 AS sort_order
  UNION ALL SELECT 'Das, V. (2002g). The Jos carnage and democracy.' AS citation, 2002 AS year, NULL AS url, 5 AS sort_order
  UNION ALL SELECT 'Das, V. (2001a). Democracy and raw capitalism.' AS citation, 2001 AS year, NULL AS url, 6 AS sort_order
) AS v WHERE c.slug = 'democracy-nation-building-socio-political-development';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Das, V. (2017). Political sex scandals: Post-conventional morality approach.' AS citation, 2017 AS year, NULL AS url, 1 AS sort_order
  UNION ALL SELECT 'Das, V. (2014, February). Sex and the leadership crisis.' AS citation, 2014 AS year, NULL AS url, 2 AS sort_order
  UNION ALL SELECT 'Das, V. (2002f). Life without sex: An exploration of merits in celibacy.' AS citation, 2002 AS year, NULL AS url, 3 AS sort_order
  UNION ALL SELECT 'Das, V. (2000b). Sex: Its political, economic and social implications.' AS citation, 2000 AS year, NULL AS url, 4 AS sort_order
) AS v WHERE c.slug = 'sexuality-celibacy-social-ethics';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Das, V. (2008). The role of the Hare Krishnas In Mitigating the Social Menace of HIV/AIDS in Nigeria.' AS citation, 2008 AS year, NULL AS url, 1 AS sort_order
  UNION ALL SELECT 'Das, V. (2003c). The challenge of the curriculum paradigm implicit in Vaisnava education in curbing HIV/AIDS pandemic in Nigeria.' AS citation, 2003 AS year, NULL AS url, 2 AS sort_order
) AS v WHERE c.slug = 'vaisnava-studies-iskcon-faith-based-social-impact';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Khandelwal, P., Harshit and Manna, I., 2024. Intelligent Design of High Strength and High Conductivity Copper Alloys Using Machine Learning Assisted by Genetic Algorithm.' AS citation, 2024 AS year, NULL AS url, 1 AS sort_order
  UNION ALL SELECT 'Kuila, S.K., Harshit, Roy, N., Ghanta, S., Pan, R., Buxi, K., Pramanik, P., Bera, A.K., Saha, B., Yusuf, S.M. and Petricek, V., 2023. Ni3InSb: Synthesis, Crystal Structure, Electronic Structure, and Magnetic Properties.' AS citation, 2023 AS year, NULL AS url, 2 AS sort_order
  UNION ALL SELECT 'Roy, N., Harshit, Mondal, A., Wang, F. and Jana, P.P., 2022. Structural and Theoretical Investigations on the Unique Coloring Scheme of the γ-Brass Type Phase: Cu5+δCd8−δ.' AS citation, 2022 AS year, NULL AS url, 3 AS sort_order
  UNION ALL SELECT 'Roy, N., Koley, B., Harshit and Jana, P.P., 2022. Formation and stability of Rh2Cd5.' AS citation, 2022 AS year, NULL AS url, 4 AS sort_order
  UNION ALL SELECT 'Roy, N., Harshit and Jana, P.P., 2022. Hydrogen storage properties of ternary ordered cubic Laves phase Cu3Cd2In.' AS citation, 2022 AS year, NULL AS url, 5 AS sort_order
  UNION ALL SELECT 'Roy, N., Kuila, S.K., Mondal, A., Sikdar, R., Harshit, Ghanta, S., Wang, F. and Jana, P.P., 2022. Crystal structure, electronic structure and phase stability of the Cu2−xMxCd (M = Zn, Ga, Ge, Sn) pseudo-binary Laves phases.' AS citation, 2022 AS year, NULL AS url, 6 AS sort_order
  UNION ALL SELECT 'Harshit, Roy, N., Chakrabarty, A. and Jana, P.P., 2021. Site preference, atomic ordering, electronic structure and chemical bonding of A3Pd5 (A = Mg, Al, Ga): First principles study.' AS citation, 2021 AS year, NULL AS url, 7 AS sort_order
  UNION ALL SELECT 'Roy, N., Kumari, S., Sikdar, R., Sharma, A., Harshit, Ghanta, S., Sharma, S., Deshpande, P.A. and Jana, P.P., 2021. Synthesis, Crystal Structure, Electronic Structure, and Catalytic Properties of Ni3GaSb.' AS citation, 2021 AS year, NULL AS url, 8 AS sort_order
  UNION ALL SELECT 'Koley, B., Roy, N., Harshit, Mallick, S., Simonov, A. and Jana, P.P., 2021. A Vacancy-Driven Intermetallic Phase: Rh3Cd5−δ (δ ∼ 0.56).' AS citation, 2021 AS year, NULL AS url, 9 AS sort_order
  UNION ALL SELECT 'Roy, N., Giri, S., Harshit and Jana, P.P., 2021. Site preference and atomic ordering in the ternary Rh5Ga2As.' AS citation, 2021 AS year, NULL AS url, 10 AS sort_order
  UNION ALL SELECT 'Roy, N., Kumari, S., Harshit, Jana, P.P. and Deshpande, P.A., 2021. Hydrogen storage properties of hexagonal C14 Laves phase Cu2Cd.' AS citation, 2021 AS year, NULL AS url, 11 AS sort_order
  UNION ALL SELECT 'Roy, N., Kuila, S.K., Harshit, Pramanik, P. and Jana, P.P. Selective Chemical Substitution of Cu in the Structure of TiAl3 Type InPd3.' AS citation, NULL AS year, NULL AS url, 12 AS sort_order
) AS v WHERE c.slug = 'materials-science-computational-materials';

INSERT INTO publications (category_id, citation, year, url, sort_order)
SELECT c.id, v.citation, v.year, v.url, v.sort_order FROM research_categories c JOIN (
  SELECT 'Mohapatra, D.P., Kumar, R., Mall, R., Kumar, D.S. and Bhasin, M., 2006. Distributed dynamic slicing of Java programs. Journal of Systems and Software, 79(12), pp.1661-1678.' AS citation, 2006 AS year, NULL AS url, 1 AS sort_order
) AS v WHERE c.slug = 'computer-science-software-engineering';

-- Consultancy
INSERT INTO consultancy_groups (slug, name, tagline, sort_order) VALUES
('enterprise', 'Enterprise Application Development', 'Helping enterprises make faster, better-informed decisions.', 1),
('web-mobile', 'Web & Mobile Application Development', 'Technology to accelerate your business.', 2),
('iot', 'IoT – Internet of Things', 'Automation to enhance productivity and boost revenue.', 3),
('upcoming', 'Upcoming Products', 'Tech solutions for enhancing well-being and mental health.', 4);

INSERT INTO consultancy_projects (group_id, slug, name, description, image, url, sort_order)
SELECT (SELECT id FROM consultancy_groups WHERE slug = 'enterprise'), 'salpg', 'SALPG', 'South Asia LPG Pvt Ltd is a 50-50 joint Venture of Hindustan Petroleum Corporation of India and Total S.A. of France. Transenigma has been partnering SALPG for a long time in developing web applications which facilitate the business intelligence process, periodic reporting and historic data persistence.', '/images/projects/salpg.webp', 'https://www.salpg.com/', 1
UNION ALL SELECT (SELECT id FROM consultancy_groups WHERE slug = 'enterprise'), 'mjunction', 'Mjunction', 'Transenigma has been a proud technology partner of mjunction (a TATA-SAIL company). We have worked on developing enterprise mobile apps for loyalty programs for their clients such as TATA Tiscon, Nestle, JSW, Nuvoco-vistas, Dalmia. Mobile apps consisted of both Android & IOS Platforms in native and hybrid.', '/images/projects/mjunction.webp', 'https://www.mjunction.in/', 2
UNION ALL SELECT (SELECT id FROM consultancy_groups WHERE slug = 'web-mobile'), 'yogavihara', 'Yogavihara', 'Yogavihara is a web platform developed to digitally present and organize Patanjali''s Yogasutras in a structured and user-friendly manner. The platform provides access to verses, translations, commentaries, references, and keyword-based navigation to support systematic study and content exploration. We developed the website with features focused on readability, structured content management, and efficient search functionality, enabling users to access and navigate the philosophical content with ease.', '/images/projects/yogavihara.webp', 'https://yogavihara-frontend.vercel.app/Contents/chapter/1/1', 1
UNION ALL SELECT (SELECT id FROM consultancy_groups WHERE slug = 'web-mobile'), 'brainwave-science', 'Brainwave Science', 'iCognative is a forensic technology that uses the state-of-the-art brainwave science to investigate whether crime-related information is stored in the brain by precise measurement and analysis of brainwaves. It brings together people from the domains of neuroscience, computer science, hardware modelling to track down the criminals. We developed an application to help the forensic experts carry out the interrogation of suspects. Built using the power of NodeJS and Python-Flask, the client and server sync together, in such a way that various investigators (or departments) can work on the same case independently, without having to worry about their online presence all the time.', '/images/projects/brainwave-science.webp', NULL, 2
UNION ALL SELECT (SELECT id FROM consultancy_groups WHERE slug = 'web-mobile'), 'kolkata-ventures', 'Kolkata Ventures', 'Kolkata Ventures is an Indo-US collaboration to foster entrepreneurship in the Eastern Region of India. Transenigma handles all their IT requirements including their website, payment integrations and other back-end support.', '/images/projects/kolkata-ventures.webp', 'https://kolkataventures.com/', 3
UNION ALL SELECT (SELECT id FROM consultancy_groups WHERE slug = 'web-mobile'), 'oil-india', 'Oil India', 'Oil India Limited, a Government of India Enterprise and one of the largest hydrocarbon exploration and production Indian Public Sector company. Our inventory management web application facilitates the tracking and monitoring of the inventory of consumables for the organisation.', '/images/projects/oil-india.webp', 'https://www.oil-india.com/', 4
UNION ALL SELECT (SELECT id FROM consultancy_groups WHERE slug = 'web-mobile'), 'iskcon-kolkata', 'ISKCON Kolkata', 'ISKCON is an international cultural organisation with branches all over the world. Transenigma has been involved in multiple projects with ISKCON Kolkata including website development, event management systems and payment integrations.', '/images/projects/iskcon-kolkata.webp', 'https://www.iskconkolkata.com/', 5
UNION ALL SELECT (SELECT id FROM consultancy_groups WHERE slug = 'web-mobile'), 'annamrita', 'Annamrita', 'Annamrita is an initiative under the Government of India Mid Day meal program. It alone serves food to over 12 lakh children daily. We are building a loyalty program for the organization to offer vouchers, discount coupons, cashbacks and rewards to acknowledge and reward the donor supporting the initiative.', '/images/projects/annamrita.webp', 'https://annamrita.org/', 6
UNION ALL SELECT (SELECT id FROM consultancy_groups WHERE slug = 'iot'), 'cqt-quantum-optics', 'CQT Quantum Optics Lab Upgrade', 'Centre for Quantum Technologies is a Research Centre of Excellence hosted by the National University of Singapore. It is a platform designed for physicists, computer scientists and engineers to research on quantum physics. Using FPGA designing, Python programming and Tcl scripting we upgraded the Quantum Optics and Quantum Computing Lab in CQT. Now the setup works at improved clock timings, facilitating control of LASER at the timescale of the order of microseconds.', '/images/projects/cqt-quantum-optics.webp', NULL, 1
UNION ALL SELECT (SELECT id FROM consultancy_groups WHERE slug = 'upcoming'), 'behavioural-analytics', 'Behavioural Analytics Over Social Media', 'Employing multi platform personality signature using statistical NLP, Face++, Topical Modelling, Complex Networks, Graph Theory, Latent Dirichlet Models etc.', '/images/projects/behavioural-analytics.webp', NULL, 1
UNION ALL SELECT (SELECT id FROM consultancy_groups WHERE slug = 'upcoming'), 'depression-prediction', 'Depression Prediction Engine', 'State of the art deep learning insights on Twitter, Facebook with crowdsourced training data, surveys and other social communities like Reddit etc.', '/images/projects/depression-prediction.webp', NULL, 2;
