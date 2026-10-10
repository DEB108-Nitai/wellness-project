import { api } from './client';
import { CohortTiming, ProgramCode } from './challenge';

export type RegistrationStatus = 'registered' | 'confirmed' | 'waitlisted' | 'completed' | 'cancelled';
export const REGISTRATION_STATUSES: RegistrationStatus[] = ['registered', 'confirmed', 'waitlisted', 'completed', 'cancelled'];

export interface AdminRegistration {
  id: number;
  ref: string;
  program: ProgramCode;
  programName: string;
  status: RegistrationStatus;
  cohortTiming: CohortTiming;
  createdAt: string;
  name: string;
  email: string;
  phone: string;
  age: number | null;
  city: string | null;
  country: string | null;
  struggles: string[];
  primaryGoal: string | null;
  adminNotes: string | null;
  userId: number | null;
}

export interface RegistrationFilters {
  program?: ProgramCode;
  status?: RegistrationStatus;
  q?: string;
  page?: number;
  perPage?: number;
}

export interface RegistrationPage {
  items: AdminRegistration[];
  page: number;
  perPage: number;
  total: number;
  /** program → status → count (all registrations, unfiltered) */
  counts: Partial<Record<ProgramCode, Partial<Record<RegistrationStatus, number>>>>;
}

export interface AdminSettings {
  site_name: string;
  support_email: string;
  linkedin_url: string;
  announcement_text: string;
  announcement_active: boolean;
  maintenance_mode: boolean;
  signup_open: boolean;
  challenge_registration_open: boolean;
  items_per_page: number;
  min_age: number;
  too_fast_minutes: number;
  consent_version: string;
}

const query = (f: RegistrationFilters) => {
  const params = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : '';
};

export const adminApi = {
  registrations: (f: RegistrationFilters) => api.get<RegistrationPage>(`/admin/registrations${query(f)}`),
  updateRegistration: (id: number, changes: { status?: RegistrationStatus; adminNotes?: string | null }) =>
    api.patch<AdminRegistration>(`/admin/registrations/${id}`, changes),
  /** Plain link: the browser downloads the streamed CSV with the session cookie. */
  registrationsCsvUrl: (f: RegistrationFilters) => `/api/admin/export/registrations${query({ program: f.program, status: f.status, q: f.q })}`,
  settings: () => api.get<AdminSettings>('/admin/settings'),
  updateSettings: (changes: Partial<AdminSettings>) => api.put<AdminSettings>('/admin/settings', changes),
};
