import { api } from './client';

export type ProgramCode = 'STI' | 'TTI' | 'PTI';
export type CohortTiming = 'morning' | 'evening' | 'weekend';

export const PROGRAMS: Record<ProgramCode, { name: string; short: string }> = {
  STI: { name: 'Sonic Therapeutic Intervention', short: 'Sonic (STI)' },
  PTI: { name: 'Philosophical Therapeutic Intervention', short: 'Philosophical (PTI)' },
  TTI: { name: 'Transcendental Therapeutic Intervention', short: 'Transcendental (TTI)' },
};

/** Must match ChallengeService::STRUGGLES on the server. */
export const STRUGGLES = [
  'Overthinking & Procrastination',
  'Screen Addiction / Doomscrolling',
  'Stress & Anxiety',
  'Restless Sleep / Late Nights',
  'Lack of Spiritual Grounding',
  'Emotional Reactivity',
] as const;

export interface RegistrationInput {
  program: ProgramCode;
  name: string;
  email: string;
  phone: string;
  age?: number;
  city?: string;
  cohortTiming: CohortTiming;
  struggles: string[];
  primaryGoal?: string;
  consent: boolean;
  /** Honeypot (must stay empty) and form-render timestamp for bot protection. */
  website: string;
  formStartedAt: number;
}

export interface Registration {
  ref: string;
  program: ProgramCode;
  programName: string;
  status: 'registered' | 'confirmed' | 'waitlisted' | 'completed' | 'cancelled';
  cohortTiming: CohortTiming;
  createdAt: string;
}

export const challengeApi = {
  register: (input: RegistrationInput) => api.post<Registration>('/challenge/registrations', input),
  mine: () => api.get<Registration[]>('/challenge/my-registrations'),
};
