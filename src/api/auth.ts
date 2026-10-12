import { api } from './client';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  /** The one admin who adds and removes admins (slice F2). */
  isPrimaryAdmin: boolean;
  emailVerified: boolean;
  hasPassword: boolean;
  hasGoogle: boolean;
  createdAt: string | null;
}

/** ADM-12: an admin whose password (or Google) was accepted; the authenticator code is still due. */
export interface TwoFactorPending {
  /** 'setup' at the first admin sign-in, then 'code'. */
  step: 'setup' | 'code';
  name: string;
}

export interface SessionPayload {
  user: AuthUser | null;
  csrfToken: string;
  googleEnabled: boolean;
  /** Set once, right after a sign-in that attached a finished guest test. */
  claimedResultRef?: string;
  twoFactor?: TwoFactorPending;
}

/** A new authenticator secret and the otpauth:// link its QR code carries. */
export interface AuthenticatorSetup {
  secret: string;
  uri: string;
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
  twoFactorSetup: () => api.post<AuthenticatorSetup>('/auth/2fa/setup'),
  twoFactorEnable: (code: string) => api.post<SessionPayload & { recoveryCodes: string[] }>('/auth/2fa/enable', { code }),
  twoFactorVerify: (code: string) => api.post<SessionPayload & { recoveryCodesLeft?: number }>('/auth/2fa/verify', { code }),
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

/** The second-step page for an admin sign-in, keeping where they were going. */
export function twoFactorPath(next: string): string {
  return `/login/2fa${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;
}

/** Only same-site relative paths are allowed as post-login destinations. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next;
}
