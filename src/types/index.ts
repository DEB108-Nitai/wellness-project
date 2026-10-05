/**
 * Wellness 16 Personality Factors Platform - Type Definitions
 * Based on IPIP 16-Factor Model & PRD v1.0
 */

export type FactorCode =
  | 'A' | 'B' | 'C' | 'E' | 'F' | 'G' | 'H' | 'I'
  | 'L' | 'M' | 'N' | 'O' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface FactorDefinition {
  code: FactorCode;
  name: string;
  lowLabel: string;
  highLabel: string;
  shortDesc: string;
  detailedDesc: string;
  category: 'Interpersonal' | 'Emotional' | 'Cognitive' | 'Self-Regulation';
  lowPoleDesc: string;
  highPoleDesc: string;
  averagePoleDesc: string;
  workplaceImpact: string;
  sortOrder: number;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  siteName: string;
  supportEmail: string;
  itemsPerPage: number;
  scalePoints: number;
  minAge: number;
  tooFastMinutes: number;
  announcementText: string;
  announcementActive: boolean;
  registrationOpen: boolean;
  backupJsonEnabled: boolean;
}

export interface AuditLogEntry {
  id: string;
  actorType: 'admin' | 'system';
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  createdAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  handled: boolean;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar?: string;
  createdAt: string;
}

export type ChallengeTrack = 'tti-intensive' | 'mind-consciousness';

export interface ChallengeRegistration {
  id: string;
  referenceCode: string; // e.g. TTI-60-8K2Q9X
  name: string;
  email: string;
  phone: string;
  age?: number;
  city?: string;
  programTrack: ChallengeTrack;
  cohortTiming: 'morning' | 'evening' | 'weekend';
  currentStruggles: string[];
  primaryGoal: string;
  status: 'pending' | 'confirmed' | 'waitlisted' | 'completed';
  createdAt: string;
  notes?: string;
}

export type SonicTherapyFormat = 'sound-bath-circle' | 'one-on-one-clinical' | '21-day-reset-protocol';

export interface SonicRegistration {
  id: string;
  referenceCode: string; // e.g. STI-SOUND-8K2Q9X
  name: string;
  email: string;
  phone: string;
  age?: number;
  city?: string;
  therapyFormat: SonicTherapyFormat;
  sessionPreference: 'in-person' | 'live-online' | 'recorded-frequency-suite';
  primaryFocus: string[]; // e.g. ['Anxiety & Stress Dissolution', 'Sleep & Insomnia Recovery', 'Trauma & Somatic Release', 'Deep Focus & Neuro-Clarity']
  specialNotes?: string;
  status: 'pending' | 'confirmed' | 'waitlisted' | 'completed';
  createdAt: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'Assessment' | 'Science & Scoring' | 'Privacy & Data' | 'Organizations' | '60 Days Challenge' | 'Sonic Therapy';
  sortOrder: number;
}
