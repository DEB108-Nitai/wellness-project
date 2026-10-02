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

export interface QuestionItem {
  id: number;
  position: number;
  text: string;
  factorCode?: FactorCode;
  reverseKeyed: boolean;
  isAttentionCheck?: boolean;
  expectedAnswer?: number; // 1-5
}

export type SessionStatus = 'started' | 'in_progress' | 'completed' | 'expired' | 'deleted';

export interface Demographics {
  country: string;
  age: number;
  gender: 'Female' | 'Male' | 'Non-binary' | 'Prefer not to say' | 'Self-describe';
  genderText?: string;
  education?: string;
  occupationField?: string;
  nativeLanguage?: string;
  nickname?: string;
  email?: string;
  emailConsent?: boolean;
  shareWithCampaign?: boolean;
}

export interface QualityFlags {
  attentionChecksFailed: number;
  isStraightLining: boolean;
  isTooFast: boolean;
  durationSeconds: number;
  flagged: boolean;
  notes: string[];
}

export interface FactorScoreResult {
  factorCode: FactorCode;
  factorName: string;
  rawScore: number;
  zScore: number;
  sten: number; // 1 to 10
  percentile: number;
  band: 'low' | 'average' | 'high';
  lowLabel: string;
  highLabel: string;
  interpretation: string;
}

export interface GlobalDomainScore {
  name: string;
  description: string;
  sten: number;
  band: 'low' | 'average' | 'high';
  constituentFactors: FactorCode[];
}

export interface TestSession {
  id: string;
  token: string;
  referenceId: string; // e.g. WL-7K2Q9X
  campaignId?: string;
  campaignSlug?: string;
  status: SessionStatus;
  currentPage: number;
  consentVersion: string;
  consentAt: string;
  demographics: Demographics;
  draftAnswers: Record<number, number>; // questionId -> answer (1-5)
  answeredCount: number;
  pageTimes: Record<number, number>; // page -> seconds spent
  startedAt: string;
  lastActivityAt: string;
  completedAt?: string;
  idempotencyKey: string;
  scores?: FactorScoreResult[];
  globalDomains?: GlobalDomainScore[];
  qualityFlags?: QualityFlags;
  review?: {
    rating: number;
    comment?: string;
    createdAt: string;
  };
}

export type ResearcherStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'banned';

export interface Researcher {
  id: string;
  name: string;
  email: string;
  organization: string;
  country: string;
  purpose: string;
  status: ResearcherStatus;
  statusReason?: string;
  createdAt: string;
  lastLoginAt?: string;
}

export type CampaignStatus = 'draft' | 'pending_approval' | 'live' | 'paused' | 'rejected' | 'closed' | 'archived';

export interface Campaign {
  id: string;
  researcherId?: string; // null = platform default
  researcherName?: string;
  slug: string;
  title: string;
  description?: string;
  welcomeMessage?: string;
  targetSample?: number;
  startsAt?: string;
  endsAt?: string;
  status: CampaignStatus;
  statusReason?: string;
  createdAt: string;
  responsesCount?: number;
  completedCount?: number;
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
  researcherAutoApprove: boolean;
  backupJsonEnabled: boolean;
}

export interface AuditLogEntry {
  id: string;
  actorType: 'admin' | 'researcher' | 'system';
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  createdAt: string;
}

export interface DeletionRequest {
  id: string;
  referenceId: string;
  email?: string;
  status: 'pending' | 'approved' | 'rejected' | 'done';
  reason?: string;
  createdAt: string;
  handledAt?: string;
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

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'Assessment' | 'Science & Scoring' | 'Privacy & Data' | 'Organizations';
  sortOrder: number;
}
