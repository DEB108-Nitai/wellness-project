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
  cohort?: CohortTiming;
  /** Whole days, YYYY-MM-DD, inclusive. */
  from?: string;
  to?: string;
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

/** `?a=1&b=x` from a filter object: empty values are left out, booleans become 1 / 0. Every admin list and CSV link uses it. */
const query = (f: object) => {
  const params = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
  });
  const s = params.toString();
  return s ? `?${s}` : '';
};

export interface CountPair {
  label: string;
  count: number;
}

/** Charts for the registrations page (same filters as the list). */
export interface RegistrationStats {
  total: number;
  from: string;
  to: string;
  byDay: ({ day: string } & Record<ProgramCode, number>)[];
  byProgram: CountPair[];
  byStatus: CountPair[];
  byCohort: CountPair[];
  ageBands: CountPair[];
  struggles: CountPair[];
  cities: CountPair[];
  countries: CountPair[];
}

export const adminApi = {
  registrations: (f: RegistrationFilters) => api.get<RegistrationPage>(`/admin/registrations${query(f)}`),
  registrationStats: (f: RegistrationFilters) => api.get<RegistrationStats>(`/admin/registrations/stats${query(f)}`),
  updateRegistration: (id: number, changes: { status?: RegistrationStatus; adminNotes?: string | null }) =>
    api.patch<AdminRegistration>(`/admin/registrations/${id}`, changes),
  /** Plain link: the browser downloads the streamed CSV with the session cookie. */
  registrationsCsvUrl: (f: RegistrationFilters) =>
    `/api/admin/export/registrations${query({ program: f.program, status: f.status, cohort: f.cohort, from: f.from, to: f.to, q: f.q })}`,
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

/** A consultancy category's slug (its /consultancy#… anchor; fixed once created). */
export type ProjectGroup = string;
/** clients = client work (counted on the home page, client names listed); products = our products in development. */
export type GroupKind = 'clients' | 'products';

export interface AdminProjectGroup {
  id: number;
  slug: ProjectGroup;
  name: string;
  tagline: string;
  kind: GroupKind;
  sortOrder: number;
  projectCount: number;
}

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

export interface GroupInput {
  name: string;
  tagline: string | null;
  kind: GroupKind;
}

/** A project goes into an existing category (group) or a new one created with it (newGroup). */
export type ProjectInput = Omit<AdminProject, 'id' | 'slug' | 'group' | 'clientName'> & { clientName?: string | null; group?: ProjectGroup; newGroup?: GroupInput };

export const contentAdminApi = {
  research: () => api.get<{ categories: AdminCategory[]; papers: AdminPaper[] }>('/admin/research'),
  createCategory: (c: { name: string; tagline: string | null; published?: boolean }) => api.post<AdminCategory>('/admin/research/categories', c),
  updateCategory: (id: number, c: Partial<Pick<AdminCategory, 'name' | 'tagline' | 'published' | 'sortOrder'>>) =>
    api.patch<AdminCategory>(`/admin/research/categories/${id}`, c),
  deleteCategory: (id: number) => api.delete<null>(`/admin/research/categories/${id}`),
  createPaper: (p: PaperInput) => api.post<AdminPaper>('/admin/research/papers', p),
  updatePaper: (id: number, p: Partial<PaperInput>) => api.patch<AdminPaper>(`/admin/research/papers/${id}`, p),
  deletePaper: (id: number) => api.delete<null>(`/admin/research/papers/${id}`),

  consultancy: () => api.get<{ groups: AdminProjectGroup[]; projects: AdminProject[] }>('/admin/consultancy'),
  createGroup: (g: GroupInput) => api.post<AdminProjectGroup>('/admin/consultancy/categories', g),
  updateGroup: (id: number, g: Partial<GroupInput & { sortOrder: number }>) => api.patch<AdminProjectGroup>(`/admin/consultancy/categories/${id}`, g),
  deleteGroup: (id: number) => api.delete<null>(`/admin/consultancy/categories/${id}`),
  createProject: (p: ProjectInput) => api.post<AdminProject>('/admin/consultancy/projects', p),
  updateProject: (id: number, p: Partial<ProjectInput>) => api.patch<AdminProject>(`/admin/consultancy/projects/${id}`, p),
  deleteProject: (id: number) => api.delete<null>(`/admin/consultancy/projects/${id}`),
  uploadProjectImage: (file: File) => {
    const form = new FormData();
    form.append('image', file);
    return api.upload<{ path: string }>('/admin/uploads/project-image', form);
  },
};

// ------------------------------------------------------------------ participants (Phase 5 slice C)

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned' | 'expired';

export interface ParticipantFilters {
  status?: SessionStatus;
  flagged?: boolean;
  country?: string;
  account?: 'user' | 'guest';
  from?: string;
  to?: string;
  q?: string;
  page?: number;
  perPage?: number;
}

export interface ParticipantRow {
  ref: string;
  status: SessionStatus;
  /** The account behind the test; null for a guest. */
  person: { userId: number; name: string; email: string | null; anonymised: boolean } | null;
  nickname: string | null;
  country: string | null;
  age: number | null;
  startedAt: string;
  completedAt: string | null;
  activeMinutes: number;
  answeredCount: number;
  totalItems: number;
  /** null until the test is submitted. */
  flagged: boolean | null;
  topTraits: { code: string; name: string; sten: number }[];
}

export interface ParticipantPage {
  items: ParticipantRow[];
  page: number;
  perPage: number;
  total: number;
  byStatus: Record<SessionStatus, number>;
  flagged: number;
  from: string;
  to: string;
  byDay: { day: string; started: number; completed: number }[];
}

export interface ParticipantItem {
  position: number;
  code: string;
  factor: string | null;
  keyed: '+' | '-' | null;
  text: string;
  attentionCheck: boolean;
  expected: number | null;
  answer: number | null;
  attentionFailed: boolean;
}

export interface ParticipantDetail extends ParticipantRow {
  demographics: { country: string | null; age: number | null; gender: string | null; genderText: string | null; education: string | null; occupation: string | null };
  consentAt: string | null;
  lastActivityAt: string | null;
  itemSetVersion: string;
  normVersion: string | null;
  quality: { flagged: boolean; attentionChecksFailed?: number; straightLineRatio?: number; activeSeconds?: number; tooFast?: boolean; notes?: string[] } | null;
  items: ParticipantItem[];
  report: import('./assessment').ResultReport | null;
}

export const participantsApi = {
  list: (f: ParticipantFilters) => api.get<ParticipantPage>(`/admin/sessions${query(f)}`),
  detail: (ref: string) => api.get<ParticipantDetail>(`/admin/sessions/${encodeURIComponent(ref)}`),
  /** Plain link: the browser downloads the streamed CSV with the session cookie. */
  csvUrl: (f: ParticipantFilters, answers: boolean) => {
    const { page: _p, perPage: _pp, ...rest } = f;
    return `/api/admin/export/sessions${query({ ...rest, ...(answers ? { answers: true } : {}) })}`;
  },
};

// ------------------------------------------------------------------ visitors (Phase 5 slice D)

export interface VisitorDay {
  day: string;
  visitors: number;
  views: number;
  signedIn: number;
  signups: number;
  testsStarted: number;
  testsCompleted: number;
  registrations: number;
}

export interface VisitorMetrics {
  days: number;
  from: string;
  today: Omit<VisitorDay, 'day'>;
  last7: { visitors: number; views: number };
  period: { visitors: number; views: number; averageDailyVisitors: number; viewsPerVisit: number; signups: number; testsCompleted: number };
  byDay: VisitorDay[];
  topPages: { label: string; views: number; visitors: number }[];
  referrers: { label: string; count: number }[];
  rawDays: number;
}

export const visitorsApi = {
  metrics: (days: number) => api.get<VisitorMetrics>(`/admin/visitors?days=${days}`),
};

// ------------------------------------------------------------------ dashboard (Phase 5 slice E)

export interface TestPeriod {
  started: number;
  completed: number;
  completionRate: number;
  flagged: number;
}

export interface AuditEvent {
  id: number;
  action: string;
  actorType: 'guest' | 'user' | 'admin' | 'system';
  actorName: string | null;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
}

export interface Dashboard {
  tests: { last7: TestPeriod; last30: TestPeriod; allTime: TestPeriod };
  users: { total: number; last7: number; last30: number; admins: number };
  registrations: Partial<Record<ProgramCode, Partial<Record<RegistrationStatus, number>>>>;
  messages: { new: number };
  subscribers: number;
  visitors: { today: number; last7: number; byDay: { day: string; visitors: number }[] };
  recentActivity: AuditEvent[];
}

export const dashboardApi = {
  get: () => api.get<Dashboard>('/admin/dashboard'),
};

/** Plain-language names for audit actions (shown on the dashboard and the audit log). */
export const AUDIT_LABELS: Record<string, string> = {
  AUTH_LOGIN: 'Signed in',
  AUTH_LOGOUT: 'Signed out',
  AUTH_SIGNUP: 'Created an account',
  AUTH_LOGIN_FAILED: 'Failed sign-in',
  AUTH_LOCKOUT: 'Locked out after failed sign-ins',
  AUTH_EMAIL_VERIFIED: 'Verified their email',
  AUTH_RESET_REQUESTED: 'Asked for a password reset',
  AUTH_PASSWORD_RESET: 'Reset their password',
  AUTH_GOOGLE_LINKED: 'Linked Google sign-in',
  AUTH_GOOGLE_LINK_REFUSED: 'Google link refused',
  AUTH_UNPROVEN_PASSWORD_REMOVED: 'Unproven password removed',
  ACCOUNT_UPDATED: 'Updated their account',
  ACCOUNT_PASSWORD_CHANGED: 'Changed their password',
  SESSION_STARTED: 'Started the 16PF test',
  SESSION_COMPLETED: 'Completed the 16PF test',
  SESSION_ABANDONED: 'Restarted the 16PF test',
  SESSIONS_CLAIMED: 'Guest test attached to account',
  RESULTS_SHARE_ENABLED: 'Shared a report link',
  RESULTS_SHARE_DISABLED: 'Turned off a report link',
  CHALLENGE_REGISTERED: 'Registered for a 60-day program',
  CHALLENGE_DUPLICATE: 'Registered again (already registered)',
  CHALLENGE_UPDATED: 'Updated a registration',
  CONTACT_MESSAGE: 'Sent a contact message',
  EXPORT_REGISTRATIONS: 'Exported registrations',
  EXPORT_SESSIONS: 'Exported assessments',
  SETTINGS_UPDATED: 'Changed site settings',
  CONTENT_PAPER_CREATED: 'Added a research paper',
  CONTENT_PAPER_UPDATED: 'Edited a research paper',
  CONTENT_PAPER_DELETED: 'Deleted a research paper',
  CONTENT_CATEGORY_CREATED: 'Added a research category',
  CONTENT_CATEGORY_UPDATED: 'Edited a research category',
  CONTENT_CATEGORY_DELETED: 'Deleted a research category',
  CONTENT_PROJECT_CREATED: 'Added a consultancy project',
  CONTENT_PROJECT_UPDATED: 'Edited a consultancy project',
  CONTENT_PROJECT_DELETED: 'Removed a consultancy project',
  CONTENT_PROJECT_CATEGORY_CREATED: 'Added a consultancy category',
  CONTENT_PROJECT_CATEGORY_UPDATED: 'Edited a consultancy category',
  CONTENT_PROJECT_CATEGORY_DELETED: 'Deleted a consultancy category',
  CONTENT_IMAGE_UPLOADED: 'Uploaded an image',
  ADMIN_CREATED_CLI: 'Admin created (server)',
  ADMIN_PROMOTED_CLI: 'Admin promoted (server)',
  AUTH_2FA_ENABLED: 'Turned on two-step sign-in',
  AUTH_2FA_FAILED: 'Wrong sign-in code',
  AUTH_2FA_LOCKOUT: 'Locked out after wrong sign-in codes',
  AUTH_2FA_RECOVERY_USED: 'Used a recovery code',
  AUTH_2FA_RECOVERY_REGENERATED: 'Created new recovery codes',
  AUTH_2FA_CHANGED: 'Moved two-step sign-in to a new phone',
  AUTH_2FA_RESET: 'Two-step sign-in reset (server)',
  ADMIN_VIEWED_ASSESSMENT: 'Viewed an assessment',
  MESSAGE_HANDLED: 'Marked a message handled',
  MESSAGE_REOPENED: 'Marked a message as new',
  EXPORT_MESSAGES: 'Exported messages',
  EXPORT_SUBSCRIBERS: 'Exported subscribers',
  FAQ_CREATED: 'Added an FAQ',
  FAQ_UPDATED: 'Edited an FAQ',
  FAQ_DELETED: 'Deleted an FAQ',
  FAQ_REORDERED: 'Reordered the FAQs',
  USER_DISABLED: 'Disabled an account',
  USER_ENABLED: 'Enabled an account',
  USER_ANONYMISED: 'Anonymised an account',
  ADMIN_ADDED: 'Added an admin',
  ADMIN_REMOVED: 'Removed an admin',
  PRIMARY_ADMIN_TRANSFERRED: 'Handed over the primary admin role',
  PRIMARY_ADMIN_SET_CLI: 'Primary admin set (server)',
};

// ------------------------------------------------------------------ security (ADM-12)

export interface SecurityStatus {
  enabledAt: string | null;
  recoveryCodesLeft: number;
}

export const securityApi = {
  status: () => api.get<SecurityStatus>('/admin/security'),
  /** Each needs a current code from the app, or a recovery code. */
  regenerateRecoveryCodes: (code: string) => api.post<{ recoveryCodes: string[] }>('/admin/security/recovery-codes', { code }),
  startReplace: (code: string) => api.post<{ secret: string; uri: string }>('/admin/security/authenticator', { code }),
  confirmReplace: (code: string) => api.post<SecurityStatus>('/admin/security/authenticator/confirm', { code }),
};

// ------------------------------------------------------------------ messages, subscribers, FAQs, audit, question set (slice H)

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  perPage: number;
}

export type MessageStatus = 'new' | 'handled';
export interface MessageFilters {
  status?: MessageStatus;
  q?: string;
  from?: string;
  to?: string;
  page?: number;
}
export interface MessageRow {
  id: number;
  name: string;
  email: string;
  subject: string;
  preview: string;
  status: MessageStatus;
  createdAt: string;
  handledAt: string | null;
}
export interface MessageDetail extends Omit<MessageRow, 'preview'> {
  message: string;
  handledBy: string | null;
}

export type SubscriberStatus = 'subscribed' | 'unsubscribed';
export interface SubscriberRow {
  id: number;
  email: string;
  status: SubscriberStatus;
  createdAt: string;
  unsubscribedAt: string | null;
}

export interface AdminFaq {
  id: number;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  published: boolean;
}
export type FaqInput = Pick<AdminFaq, 'category' | 'question' | 'answer' | 'published'>;

export interface AuditFilters {
  action?: string;
  actorType?: 'guest' | 'user' | 'admin' | 'system';
  actor?: string;
  from?: string;
  to?: string;
  page?: number;
}
export interface AuditRow {
  id: number;
  createdAt: string;
  actorType: 'guest' | 'user' | 'admin' | 'system';
  actor: { id: number; name: string; email: string } | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
}

export interface ItemRow {
  position: number;
  code: string;
  text: string;
  factor: string | null;
  factorName: string | null;
  keyed: '+' | '-' | null;
  attentionCheck: boolean;
  expected: number | null;
}
export interface NormsData {
  normSet: { version: string; source: string; sampleSize: number };
  factors: { code: string; name: string; mean: number; sd: number; n: number | null; alpha: number | null }[];
  domains: { code: string; name: string; mean: number; sd: number }[];
}

export const siteAdminApi = {
  messages: (f: MessageFilters) => api.get<Paged<MessageRow> & { counts: Record<MessageStatus, number> }>(`/admin/messages${query({ ...f, perPage: 25 })}`),
  message: (id: number) => api.get<MessageDetail>(`/admin/messages/${id}`),
  setMessageStatus: (id: number, status: MessageStatus) => api.patch<MessageDetail>(`/admin/messages/${id}`, { status }),
  messagesCsvUrl: ({ page: _p, ...f }: MessageFilters) => `/api/admin/export/messages${query(f)}`,

  subscribers: (f: { status?: SubscriberStatus; q?: string; page?: number }) =>
    api.get<Paged<SubscriberRow> & { counts: { subscribed: number; unsubscribed: number; last30Days: number } }>(`/admin/subscribers${query({ ...f, perPage: 25 })}`),
  subscribersCsvUrl: (f: { status?: SubscriberStatus; q?: string }) => `/api/admin/export/subscribers${query(f)}`,

  faqs: () => api.get<AdminFaq[]>('/admin/faqs'),
  createFaq: (f: FaqInput) => api.post<AdminFaq>('/admin/faqs', f),
  updateFaq: (id: number, f: Partial<FaqInput>) => api.patch<AdminFaq>(`/admin/faqs/${id}`, f),
  deleteFaq: (id: number) => api.delete<null>(`/admin/faqs/${id}`),
  reorderFaqs: (ids: number[]) => api.post<AdminFaq[]>('/admin/faqs/reorder', { ids }),

  audit: (f: AuditFilters) => api.get<Paged<AuditRow> & { actions: string[] }>(`/admin/audit${query({ ...f, perPage: 50 })}`),
  items: () => api.get<{ itemSet: { version: string; description: string }; items: ItemRow[] }>('/admin/items'),
  norms: () => api.get<NormsData>('/admin/norms'),
};

// ------------------------------------------------------------------ users and the admin team (slices F, F2)

export interface AdminUserRow {
  id: number;
  name: string;
  /** Null once the account is anonymised. */
  email: string | null;
  role: 'user' | 'admin';
  isPrimaryAdmin: boolean;
  status: 'active' | 'disabled';
  anonymised: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  hasGoogle: boolean;
  twoStep: boolean;
  createdAt: string | null;
  lastLoginAt: string | null;
}

export interface AdminUserDetail extends AdminUserRow {
  tests: { ref: string; status: SessionStatus; startedAt: string | null; completedAt: string | null }[];
  registrations: { ref: string; program: ProgramCode; status: RegistrationStatus; createdAt: string | null }[];
  messages: number;
  newsletter: 'subscribed' | 'unsubscribed' | null;
  /** `by` is set when someone else (an admin, or the server) did it. */
  activity: { action: string; createdAt: string | null; by: string | null }[];
}

export interface UserFilters {
  q?: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'disabled' | 'anonymised';
  page?: number;
}

export interface TeamAdmin {
  id: number;
  name: string;
  email: string;
  isPrimary: boolean;
  status: 'active' | 'disabled';
  twoStep: boolean;
  addedBy: string | null;
  addedAt: string | null;
  lastLoginAt: string | null;
  isYou: boolean;
}

export interface Team {
  youArePrimary: boolean;
  admins: TeamAdmin[];
}

export const usersAdminApi = {
  list: (f: UserFilters) =>
    api.get<Paged<AdminUserRow> & { counts: { all: number; admins: number; disabled: number; new30: number } }>(`/admin/users${query({ ...f, perPage: 25 })}`),
  detail: (id: number) => api.get<AdminUserDetail>(`/admin/users/${id}`),
  setStatus: (id: number, status: 'active' | 'disabled') => api.patch<AdminUserRow>(`/admin/users/${id}`, { status }),
  anonymise: (id: number, confirmEmail: string) => api.post<AdminUserDetail>(`/admin/users/${id}/anonymise`, { confirmEmail }),

  team: () => api.get<Team>('/admin/admins'),
  addAdmin: (email: string, code: string) => api.post<Team>('/admin/admins', { email, code }),
  removeAdmin: (id: number, code: string) => api.post<Team>(`/admin/admins/${id}/remove`, { code }),
  makePrimary: (id: number, code: string) => api.post<Team>(`/admin/admins/${id}/make-primary`, { code }),
};
