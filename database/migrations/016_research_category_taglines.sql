-- =============================================================================
-- Research category taglines (slice S7b, owner-approved copy 2026-10-10).
-- A one-line summary per field for the homepage research cards. Each line is
-- based only on that field's publication titles.
-- =============================================================================

ALTER TABLE research_categories
  ADD COLUMN tagline VARCHAR(255) NULL COMMENT 'One-line summary for the homepage cards' AFTER name;

UPDATE research_categories SET tagline = CASE slug
  WHEN 'happiness-affect-states' THEN 'Which everyday acts move people between states of happiness, modelled from social-media data.'
  WHEN 'drug-discovery' THEN 'AI-led design of new antipsychotic drug candidates with large language models.'
  WHEN 'sankhya-vedic-psychology-ayurveda' THEN 'Sonic therapeutic intervention applied to fraud, corruption and leadership scandals.'
  WHEN 'leadership-management-organizational-change' THEN 'Change models, succession planning and trust in multigenerational organisations.'
  WHEN 'governance-corruption-ethics-public-policy' THEN 'Kleptocracy, judicial and legislative corruption, and strategies to de-escalate them.'
  WHEN 'trust-ethics-character-moral-leadership' THEN 'Why ethics fails in management, and how self-restraint and trust can be built.'
  WHEN 'spirituality-consciousness-vedanta-indian-knowledge-systems' THEN 'Vedantic perspectives on consciousness, culture and social stability.'
  WHEN 'religion-peacebuilding-conflict-resolution' THEN 'Resolving religious conflict and building peace leadership for stable democracy.'
  WHEN 'women-gender-social-transformation' THEN 'Women’s empowerment, self-restraint and traditional practices in social change.'
  WHEN 'education-learning-human-development' THEN 'Self-regulated learning, self-reliance and children’s right to inquire.'
  WHEN 'democracy-nation-building-socio-political-development' THEN 'Social stability, capitalism and integration in Nigeria’s democratic future.'
  WHEN 'sexuality-celibacy-social-ethics' THEN 'Political sex scandals, celibacy and the social ethics of sexuality.'
  WHEN 'vaisnava-studies-iskcon-faith-based-social-impact' THEN 'Faith-based responses to HIV/AIDS in Nigeria through Vaisnava education.'
  WHEN 'materials-science-computational-materials' THEN 'Intermetallic compounds, hydrogen storage and machine-learning alloy design.'
  WHEN 'computer-science-software-engineering' THEN 'Dynamic slicing of distributed Java programs.'
  ELSE tagline
END;
