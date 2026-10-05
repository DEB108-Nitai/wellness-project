-- =============================================================================
-- FAQs for three 60-day programs (STI, PTI, TTI) — owner request 2026-10-05.
-- =============================================================================

UPDATE faqs SET
  question = 'What are the three 60-Day Transformation Programs?',
  answer = 'We offer three free 60-day programs: 1) Sonic Therapeutic Intervention (STI) — a daily sound-meditation practice built around chanting the Hare Krishna mahamantra, quietly on your own and together with music, to calm the mind and sharpen focus; 2) Philosophical Therapeutic Intervention (PTI) — a guided, discussion-based study of the Bhagavad Gita As It Is, the Srimad Bhagavatam, the Chaitanya Caritamrita and other Vedic scriptures, applied to the way you think and the habits you build; and 3) Transcendental Therapeutic Intervention (TTI) — a daily ritual of chanting and reflective reading that helps you break unhelpful habit loops and build a calmer, more purposeful routine.'
WHERE question = 'What are the two 60-Day Transformation Programs?';

UPDATE faqs SET
  answer = 'All three programs are completely free. Choose STI, PTI or TTI in the 60-Day Challenge section of our home page and fill in the short registration form. You will receive a confirmation with your reference code by email, followed by the session details — including online and in-person options.'
WHERE question = 'How do I join a 60-Day Challenge and does it cost anything?';

INSERT INTO faqs (category, question, answer, sort_order, is_published) VALUES
('60 Days Challenge',
 'Can I join more than one program?',
 'Yes. You can join one, two or all three programs — just submit the registration form once for each program you would like to take part in.',
 10, 1),
('60 Days Challenge',
 'Do I need any background in philosophy or scriptures to join PTI?',
 'Not at all. PTI welcomes complete beginners as well as keen readers. Every reading is explained in simple, modern language, discussions are relaxed and friendly, and every question is welcome.',
 11, 1);
