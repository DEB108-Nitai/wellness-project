import { api } from './client';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  hasPassword: boolean;
  hasGoogle: boolean;
  createdAt: string | null;
}

export interface SessionPayload {
  user: AuthUser | null;
  csrfToken: string;
  googleEnabled: boolean;
  /** Set once, right after a sign-in that attached a finished guest test. */
  claimedResultRef?: string;
}

export interface MessagePayload {
  message: string;
}

export const authApi = {
  me: () => api.get<SessionPayload>('/auth/me'),
  login: (email: string, password: string) => api.post<SessionPayload>('/auth/login', { email, password }),
  signup: (name: string, email: string, password: string) =>
    api.post<SessionPayload>('/auth/signup', { name, email, password }),
  logout: () => api.post<SessionPayload>('/auth/logout'),
  forgotPassword: (email: string) => api.post<MessagePayload>('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post<MessagePayload>('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) => api.post<SessionPayload>('/auth/verify-email', { token }),
  resendVerification: () => api.post<MessagePayload>('/auth/resend-verification'),
  updateProfile: (name: string) => api.patch<SessionPayload>('/account', { name }),
  changePassword: (newPassword: string, currentPassword?: string) =>
    api.post<SessionPayload>('/account/password', { newPassword, ...(currentPassword ? { currentPassword } : {}) }),
};

/** Full-page navigation target for "Continue with Google" (server-side OAuth flow). */
export function googleStartUrl(next: string): string {
  return `/api/auth/google/start?next=${encodeURIComponent(safeNext(next))}`;
}

/** Where to go after signing in: a just-attached guest result wins only when no destination was chosen. */
export function afterSignIn(next: string, claimedResultRef: string | null): string {
  return next === '/' && claimedResultRef ? `/results/${claimedResultRef}` : next;
}

/** Only same-site relative paths are allowed as post-login destinations. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}
