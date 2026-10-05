import { FAQItem, SystemSettings } from '../types';

// Browser-side defaults used until settings and FAQs are served by the PHP API
// (GET /api/settings/public, GET /api/faqs). No demo records are shipped.

export const DEFAULT_SETTINGS: SystemSettings = {
  maintenanceMode: false,
  siteName: 'Wellness',
  supportEmail: 'support@wellness16pf.org',
  itemsPerPage: 7,
  scalePoints: 5,
  minAge: 18,
  tooFastMinutes: 6,
  announcementText: '✨ Standardized IPIP 16 Personality Factors Assessment - Comprehensive Visual Profile & Research Analytics',
  announcementActive: true,
  registrationOpen: true,
  backupJsonEnabled: true,
};

export const INITIAL_FAQS: FAQItem[] = [
  {
    id: 'faq_01',
    category: 'Assessment',
    question: 'What is the 16 Personality Factors assessment?',
    answer: 'The 16 Personality Factors assessment is a scientifically calibrated psychometric instrument derived from the public-domain International Personality Item Pool (IPIP). It evaluates an individual across 16 primary personality dimensions (such as Warmth, Emotional Stability, Dominance, and Perfectionism), providing an objective and holistic view of core behavioral tendencies.',
    sortOrder: 1,
  },
  {
    id: 'faq_02',
    category: 'Assessment',
    question: 'How long does the assessment take?',
    answer: 'The assessment contains 166 statements divided into 24 bite-sized pages (7 statements per screen). Most participants complete the questionnaire in 20 to 25 minutes. Your progress is saved automatically at every step.',
    sortOrder: 2,
  },
  {
    id: 'faq_03',
    category: 'Science & Scoring',
    question: 'How are Sten scores calculated?',
    answer: 'Sten (Standard Ten) scores place your results on a standardized 1 to 10 scale with a mean of 5.5. Scores 1-3 indicate the lower pole of a trait, scores 4-7 represent the balanced average range, and scores 8-10 represent the elevated high pole. All scores are computed using standardized population norms.',
    sortOrder: 3,
  },
  {
    id: 'faq_04',
    category: 'Privacy & Data',
    question: 'Is my data private and confidential?',
    answer: 'Yes. We strictly adhere to GDPR, the India DPDP Act 2023, and CCPA standards. Your responses, scores, and challenge registrations are securely stored and utilized by the platform to generate comprehensive 16-factor psychometric reports, tailor your 60-day challenge guidance, track individual transformation milestones, and maintain longitudinal progress records over time.',
    sortOrder: 4,
  },
  {
    id: 'faq_05',
    category: '60 Days Challenge',
    question: 'What are the two 60-Day Transformation Programs?',
    answer: 'We offer two dedicated 60-day tracks: 1) Sonic Therapeutic Intervention (STI) focused on sacred acoustic resonance, mantra chanting, and neuro-vagal recalibration; and 2) Transcendental Therapeutic Intervention (TTI) focused on breaking vice loops, habit restructuring, and elevating consciousness.',
    sortOrder: 5,
  },
  {
    id: 'faq_06',
    category: 'Science & Scoring',
    question: 'Is this a clinical or medical diagnosis?',
    answer: 'No. Wellness 16 Personality Factors is an educational, self-development, and behavioral wellness platform. It is not intended to diagnose or treat psychiatric or psychological disorders.',
    sortOrder: 6,
  },
];
