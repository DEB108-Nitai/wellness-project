import {
  AuditLogEntry,
  Campaign,
  ContactMessage,
  DeletionRequest,
  FAQItem,
  Researcher,
  SystemSettings,
  TestSession,
} from '../types';
import { computeFactorScores, computeQualityFlags } from '../services/scoringEngine';

export const DEFAULT_SETTINGS: SystemSettings = {
  maintenanceMode: false,
  siteName: 'Wellness',
  supportEmail: 'support@wellness16pf.org',
  itemsPerPage: 7,
  scalePoints: 5,
  minAge: 13,
  tooFastMinutes: 6,
  announcementText: '✨ Standardized IPIP 16 Personality Factors Assessment - Comprehensive Visual Profile & Research Analytics',
  announcementActive: true,
  registrationOpen: true,
  researcherAutoApprove: false,
  backupJsonEnabled: true,
};

export const INITIAL_RESEARCHERS: Researcher[] = [
  {
    id: 'res_001',
    name: 'Dr. Aris Thorne',
    email: 'aris.thorne@cambridge-behavioral.org',
    organization: 'Cambridge Behavioral & Organizational Lab',
    country: 'GB',
    purpose: 'Investigating executive decision-making and personality trait stability across tech leadership cohorts.',
    status: 'approved',
    createdAt: '2026-08-15T10:00:00Z',
    lastLoginAt: '2026-09-28T14:30:00Z',
  },
  {
    id: 'res_002',
    name: 'Dr. Priya Sharma',
    email: 'priya.sharma@talentinsights.in',
    organization: 'Talent Insights Behavioral Group',
    country: 'IN',
    purpose: 'Evaluating correlation between 16 factor profiles, job satisfaction, and retention in product teams.',
    status: 'approved',
    createdAt: '2026-08-20T11:15:00Z',
    lastLoginAt: '2026-09-30T09:45:00Z',
  },
  {
    id: 'res_003',
    name: 'Prof. Marcus Vance',
    email: 'm.vance@stanford-psych.edu',
    organization: 'Stanford Longitudinal Personality Project',
    country: 'US',
    purpose: 'Cross-cultural norm validation for remote workforce teams.',
    status: 'pending',
    createdAt: '2026-09-29T16:20:00Z',
  },
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp_001',
    researcherId: 'res_001',
    researcherName: 'Dr. Aris Thorne',
    slug: 'executive-leadership-2026',
    title: 'Executive Leadership & Strategic Agility Study',
    description: 'Benchmarking 16 personality traits among senior executives and technical founders.',
    welcomeMessage: 'Welcome to the Cambridge Behavioral Leadership Study. Please complete all statements honestly to receive your full 16-factor profile.',
    targetSample: 150,
    startsAt: '2026-09-01T00:00:00Z',
    endsAt: '2026-12-31T23:59:59Z',
    status: 'live',
    createdAt: '2026-08-22T08:00:00Z',
    responsesCount: 84,
    completedCount: 78,
  },
  {
    id: 'camp_002',
    researcherId: 'res_002',
    researcherName: 'Dr. Priya Sharma',
    slug: 'tech-talent-cohort-q4',
    title: 'High-Performing Product Teams Assessment',
    description: 'Investigating interpersonal warmth, reasoning, and stress resilience in distributed agile engineering squads.',
    welcomeMessage: 'Welcome! This assessment takes ~20 minutes and helps our team understand our collective strengths and working dynamics.',
    targetSample: 200,
    startsAt: '2026-09-10T00:00:00Z',
    endsAt: '2026-11-30T23:59:59Z',
    status: 'live',
    createdAt: '2026-09-05T12:00:00Z',
    responsesCount: 112,
    completedCount: 104,
  },
];

// Helper to create synthetic completed responses
function createSyntheticSession(
  refId: string,
  nickname: string,
  country: string,
  age: number,
  gender: 'Female' | 'Male' | 'Non-binary' | 'Prefer not to say',
  campaignSlug: string | undefined,
  daysAgo: number,
  basePattern: number,
  rating: number,
  reviewComment?: string
): TestSession {
  const answers: Record<number, number> = {};
  for (let i = 1; i <= 163; i++) {
    // Generate organic variation around base pattern
    const noise = ((i * 17 + basePattern * 31) % 5) + 1;
    answers[i] = noise;
  }
  // Attention checks correct
  answers[35] = 4; // Agree
  answers[84] = 3; // Neutral
  answers[133] = 5; // Strongly Agree

  const durationSeconds = 1200 + ((basePattern * 73) % 600);
  const { scores, globalDomains } = computeFactorScores(answers, 5);
  const qualityFlags = computeQualityFlags(answers, durationSeconds, 6);

  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const timestamp = d.toISOString();

  return {
    id: `sess_${refId.toLowerCase()}`,
    token: `tok_${refId.toLowerCase()}_${Math.random().toString(36).substring(2, 10)}`,
    referenceId: refId,
    campaignSlug,
    status: 'completed',
    currentPage: 24,
    consentVersion: 'v1.0',
    consentAt: timestamp,
    demographics: {
      country,
      age,
      gender,
      nickname,
      education: "Master's Degree",
      occupationField: 'Technology & Software',
      nativeLanguage: 'English',
      emailConsent: true,
    },
    draftAnswers: answers,
    answeredCount: 163,
    pageTimes: {},
    startedAt: timestamp,
    lastActivityAt: timestamp,
    completedAt: timestamp,
    idempotencyKey: `idemp_${refId}_${Math.random().toString(36).substring(2, 8)}`,
    scores,
    globalDomains,
    qualityFlags,
    review: {
      rating,
      comment: reviewComment,
      createdAt: timestamp,
    },
  };
}

export const INITIAL_SESSIONS: TestSession[] = [
  createSyntheticSession('WL-8K2Q9X', 'Sarah Jenkins', 'US', 34, 'Female', 'executive-leadership-2026', 1, 3, 5, 'Remarkably accurate breakdown of my communication and analytical style. The visual report is crystal clear!'),
  createSyntheticSession('WL-9P3T7B', 'Rohan Mehta', 'IN', 29, 'Male', 'tech-talent-cohort-q4', 2, 4, 5, 'Very insightful! The bipolar factor comparison helped explain how I manage stressful sprints.'),
  createSyntheticSession('WL-4V7M2K', 'Elena Rostova', 'DE', 41, 'Female', undefined, 3, 2, 4, 'Comprehensive and scientifically grounded. Smooth interface on mobile.'),
  createSyntheticSession('WL-6N1X4R', 'David Chen', 'SG', 38, 'Male', 'executive-leadership-2026', 4, 5, 5, 'Loved the strengths and development matrix. Instant export is very handy.'),
  createSyntheticSession('WL-2Y8W5L', 'Amina Al-Mansoor', 'AE', 26, 'Female', undefined, 5, 1, 5, 'Enjoyed taking this test, very intuitive slider circles.'),
  createSyntheticSession('WL-7C4D9P', 'Lucas Silva', 'BR', 31, 'Male', 'tech-talent-cohort-q4', 6, 3, 4, 'Great tool for team retrospective and self-awareness.'),
  createSyntheticSession('WL-5T2H8Q', 'Chloe Dubois', 'FR', 27, 'Female', undefined, 7, 4, 5, 'Fast, responsive, and the factor details are very detailed.'),
];

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
    answer: 'The assessment contains approximately 163 statements divided into 24 bite-sized pages (7 statements per screen). Most participants complete the questionnaire in 20 to 25 minutes. Your progress is saved automatically at every step.',
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

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'aud_001',
    actorType: 'system',
    actorName: 'System Engine',
    action: 'SYSTEM_BOOT',
    entityType: 'System',
    entityId: 'SYS_01',
    details: 'Calibrated question pool (163 items) and factor norm tables initialized.',
    createdAt: '2026-09-01T00:00:00Z',
  },
  {
    id: 'aud_002',
    actorType: 'admin',
    actorName: 'Super Admin',
    action: 'APPROVE_RESEARCHER',
    entityType: 'Researcher',
    entityId: 'res_001',
    details: 'Approved Dr. Aris Thorne (Cambridge Behavioral Lab).',
    createdAt: '2026-09-01T10:30:00Z',
  },
  {
    id: 'aud_003',
    actorType: 'admin',
    actorName: 'Super Admin',
    action: 'APPROVE_CAMPAIGN',
    entityType: 'Campaign',
    entityId: 'camp_001',
    details: 'Campaign "executive-leadership-2026" approved and made live.',
    createdAt: '2026-09-01T11:00:00Z',
  },
];

export const INITIAL_DELETIONS: DeletionRequest[] = [
  {
    id: 'del_001',
    referenceId: 'WL-3M9K2P',
    email: 'user_anonymous@domain.com',
    status: 'approved',
    reason: 'Participant requested complete data erasure under GDPR Article 17.',
    createdAt: '2026-09-20T14:10:00Z',
    handledAt: '2026-09-20T16:00:00Z',
  },
];

export const INITIAL_MESSAGES: ContactMessage[] = [
  {
    id: 'msg_001',
    name: 'Dr. Arthur Pendelton',
    email: 'arthur.p@oxford-talent.co.uk',
    subject: 'Academic Collaboration Inquiry',
    message: 'We are planning a 500-participant research study across European business schools and would like to utilize the Wellness 16PF campaign infrastructure.',
    createdAt: '2026-09-27T08:45:00Z',
    handled: true,
  },
];

export const INITIAL_CHALLENGE_REGISTRATIONS: any[] = [
  {
    id: 'reg_001',
    referenceCode: 'TTI-60-9K4P2L',
    name: 'Aarav Patel',
    email: 'aarav.patel@example.com',
    phone: '+91 98765 43210',
    age: 27,
    city: 'Mumbai',
    programTrack: 'tti-intensive',
    cohortTiming: 'morning',
    currentStruggles: ['Overthinking & Procrastination', 'Screen Addiction / Doomscrolling', 'Sleep Late / Fatigue'],
    primaryGoal: 'Break out of repetitive loops, establish an early morning routine, and build mental clarity for career growth.',
    status: 'confirmed',
    createdAt: '2026-09-25T14:30:00Z',
    notes: 'Enrolled in Morning 6:00 AM IST meditation & reflection cohort.',
  },
  {
    id: 'reg_002',
    referenceCode: 'TTI-60-3V7M8K',
    name: 'Sophia Reynolds',
    email: 'sophia.reynolds@example.com',
    phone: '+1 (555) 234-5678',
    age: 32,
    city: 'San Francisco',
    programTrack: 'mind-consciousness',
    cohortTiming: 'evening',
    currentStruggles: ['Stress & Anxiety', 'Meaningless Routine', 'Overthinking & Procrastination'],
    primaryGoal: 'Deepen mindfulness practice, dissolve work anxiety, and align daily habits with higher purpose.',
    status: 'confirmed',
    createdAt: '2026-09-28T09:15:00Z',
    notes: 'Prefers evening guided reflection circle.',
  },
  {
    id: 'reg_003',
    referenceCode: 'TTI-60-5R2W9Q',
    name: 'Vikram Sengupta',
    email: 'vikram.sengupta@example.com',
    phone: '+91 98112 34567',
    age: 24,
    city: 'Bengaluru',
    programTrack: 'tti-intensive',
    cohortTiming: 'weekend',
    currentStruggles: ['Screen Addiction / Doomscrolling', 'Stress & Anxiety'],
    primaryGoal: 'Overcome digital distraction loops, increase deep focus, and practice daily self-reflection.',
    status: 'pending',
    createdAt: '2026-10-01T11:00:00Z',
  },
];

export const INITIAL_USERS: any[] = [
  {
    id: 'usr_001',
    name: 'Alex Vance',
    email: 'alex.vance@example.com',
    role: 'user',
    createdAt: '2026-09-01T10:00:00Z',
  },
];

export const INITIAL_SONIC_REGISTRATIONS: any[] = [
  {
    id: 'sonic_001',
    referenceCode: 'STI-SOUND-7K3M9A',
    name: 'Ananya Deshmukh',
    email: 'ananya.d@example.com',
    phone: '+91 97654 32109',
    age: 29,
    city: 'Pune',
    therapyFormat: 'sound-bath-circle',
    sessionPreference: 'in-person',
    primaryFocus: ['Anxiety & Stress Dissolution', 'Sleep & Insomnia Recovery'],
    specialNotes: 'Interested in 432Hz crystal bowl sound bath for deep nervous system calming.',
    status: 'confirmed',
    createdAt: '2026-09-26T17:00:00Z',
  },
  {
    id: 'sonic_002',
    referenceCode: 'STI-SOUND-4V8L2P',
    name: 'Liam O’Connor',
    email: 'liam.oc@example.com',
    phone: '+1 (555) 876-5432',
    age: 36,
    city: 'Dublin',
    therapyFormat: 'one-on-one-clinical',
    sessionPreference: 'live-online',
    primaryFocus: ['Trauma & Somatic Release', 'Deep Focus & Neuro-Clarity'],
    specialNotes: 'Seeking personalized Solfeggio frequency protocol for chronic sympathetic nervous system arousal.',
    status: 'confirmed',
    createdAt: '2026-09-29T11:30:00Z',
  },
];


