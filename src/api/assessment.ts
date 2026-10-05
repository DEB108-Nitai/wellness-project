import { api } from './client';

export interface TestItem {
  id: number;
  position: number;
  text: string;
}

export interface ItemsPayload {
  version: string;
  itemsPerPage: number;
  minAge: number;
  items: TestItem[];
}

export interface SessionState {
  ref: string;
  status: 'in_progress' | 'completed' | 'abandoned' | 'expired';
  itemSetVersion: string;
  currentPage: number;
  /** item id (as string key) → 1..5 */
  answers: Record<string, number>;
  answeredCount: number;
  totalItems: number;
  nickname: string | null;
  startedAt: string;
}

export type Gender = 'female' | 'male' | 'non_binary' | 'prefer_not_to_say' | 'self_describe';
export type Education = 'high_school' | 'bachelors' | 'masters' | 'doctorate' | 'other';

export interface Demographics {
  country: string;
  age: number;
  gender: Gender;
  genderText?: string;
  nickname?: string;
  education?: Education;
  occupation?: string;
}

export interface FactorScore {
  factorCode: string;
  factorName: string;
  lowLabel: string;
  highLabel: string;
  category: string;
  shortDesc: string;
  rawScore: number;
  zScore: number;
  sten: number;
  percentile: number;
  band: 'low' | 'average' | 'high';
  interpretation: string;
  workplaceImpact: string;
}

export interface DomainScore {
  code: string;
  name: string;
  description: string;
  sten: number;
  band: 'low' | 'average' | 'high';
  constituentFactors: string[];
  weights: Record<string, number>;
}

export interface ResultReport {
  ref: string;
  nickname: string | null;
  completedAt: string;
  normVersion: string;
  quality: { flagged: boolean; notes: string[] };
  factors: FactorScore[];
  domains: DomainScore[];
  isOwner: boolean;
  /** Only present for the owner / admins. */
  country?: string;
  age?: number;
  shareToken?: string | null;
}

export interface HistoryEntry {
  ref: string;
  status: 'in_progress' | 'completed';
  startedAt: string;
  completedAt: string | null;
  nickname: string | null;
  answeredCount: number;
  totalItems: number;
  flagged: boolean;
  topTraits: { code: string; name: string; sten: number }[];
}

export const assessmentApi = {
  items: () => api.get<ItemsPayload>('/test/items'),
  current: () => api.get<SessionState | null>('/test/session'),
  start: (demographics: Demographics) =>
    api.post<SessionState>('/test/session', { consent: { terms: true, notDiagnosis: true }, demographics }),
  saveAnswers: (answers: Record<string, number>, page: number, pageSeconds: number) =>
    api.put<{ answeredCount: number; savedAt: string }>('/test/session/answers', { answers, page, pageSeconds }),
  abandon: () => api.post<null>('/test/session/abandon'),
  submit: (ref: string) => api.post<{ ref: string; status: 'completed'; resultsLocked: boolean }>('/test/session/submit', { ref }),
  review: (ref: string, rating: number, comment?: string) =>
    api.post<null>('/test/session/review', { ref, rating, ...(comment ? { comment } : {}) }),
};

export const resultsApi = {
  history: () => api.get<HistoryEntry[]>('/results'),
  get: (ref: string) => api.get<ResultReport>(`/results/${encodeURIComponent(ref)}`),
  share: (ref: string) => api.post<{ shareToken: string }>(`/results/${encodeURIComponent(ref)}/share`),
  unshare: (ref: string) => api.delete<{ shareToken: null }>(`/results/${encodeURIComponent(ref)}/share`),
  shared: (token: string) => api.get<ResultReport>(`/shared/${encodeURIComponent(token)}`),
};

export function shareUrl(token: string): string {
  return `${window.location.origin}/r/${token}`;
}
