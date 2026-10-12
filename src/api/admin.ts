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
  company_address: string;
  company_cin: string;
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

// ------------------------------------------------------------------ content (Phase 5 slice A)

export interface AdminCategory {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  sortOrder: number;
  published: boolean;
  paperCount: number;
}

export interface AdminPaper {
  id: number;
  categoryId: number;
  citation: string;
  year: number | null;
  url: string | null;
  published: boolean;
  createdAt: string;
}

export interface PaperInput {
  citation: string;
  year: number | null;
  url: string | null;
  published: boolean;
  categoryId?: number;
  newCategory?: { name: string; tagline: string | null };
}

export type ProjectGroup = 'enterprise' | 'web-mobile' | 'iot' | 'upcoming';

export interface AdminProject {
  id: number;
  group: ProjectGroup;
  slug: string;
  name: string;
  clientName: string | null;
  description: string;
  image: string | null;
  url: string | null;
  published: boolean;
}

export type ProjectInput = Omit<AdminProject, 'id' | 'slug'>;

export const contentAdminApi = {
  research: () => api.get<{ categories: AdminCategory[]; papers: AdminPaper[] }>('/admin/research'),
  createCategory: (c: { name: string; tagline: string | null; published?: boolean }) => api.post<AdminCategory>('/admin/research/categories', c),
  updateCategory: (id: number, c: Partial<Pick<AdminCategory, 'name' | 'tagline' | 'published' | 'sortOrder'>>) =>
    api.patch<AdminCategory>(`/admin/research/categories/${id}`, c),
  deleteCategory: (id: number) => api.delete<null>(`/admin/research/categories/${id}`),
  createPaper: (p: PaperInput) => api.post<AdminPaper>('/admin/research/papers', p),
  updatePaper: (id: number, p: Partial<PaperInput>) => api.patch<AdminPaper>(`/admin/research/papers/${id}`, p),
  deletePaper: (id: number) => api.delete<null>(`/admin/research/papers/${id}`),

  consultancy: () => api.get<{ groups: { slug: ProjectGroup; name: string }[]; projects: AdminProject[] }>('/admin/consultancy'),
  createProject: (p: ProjectInput) => api.post<AdminProject>('/admin/consultancy/projects', p),
  updateProject: (id: number, p: Partial<ProjectInput>) => api.patch<AdminProject>(`/admin/consultancy/projects/${id}`, p),
  deleteProject: (id: number) => api.delete<null>(`/admin/consultancy/projects/${id}`),
  uploadProjectImage: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.upload<{ path: string }>('/admin/uploads/project-image', form);
  },
};
