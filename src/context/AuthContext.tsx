import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, AuthUser, SessionPayload, TwoFactorPending } from '../api/auth';
import { clearAllPending, runBeforeSignOut } from '../lib/pendingAnswers';

interface AuthState {
  user: AuthUser | null;
  /** True until the first /auth/me response arrives. */
  loading: boolean;
  googleEnabled: boolean;
  /** A finished guest test attached by the latest sign-in (see afterSignIn). */
  claimedResultRef: string | null;
  /** An admin sign-in waiting for the authenticator code (ADM-12); user stays null until it passes. */
  twoFactor: TwoFactorPending | null;
  /** Null when the account is an admin that still needs the second step. */
  login: (email: string, password: string) => Promise<AuthUser | null>;
  signup: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Apply a session payload returned by any auth/account endpoint. */
  applySession: (payload: SessionPayload) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [claimedResultRef, setClaimedResultRef] = useState<string | null>(null);
  const [twoFactor, setTwoFactor] = useState<TwoFactorPending | null>(null);

  const applySession = useCallback((payload: SessionPayload) => {
    setUser(payload.user);
    setGoogleEnabled(payload.googleEnabled);
    setClaimedResultRef(payload.claimedResultRef ?? null);
    setTwoFactor(payload.twoFactor ?? null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      applySession(await authApi.me());
    } catch {
      // Network/server problem: keep the UI usable as a signed-out visitor.
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const payload = await authApi.login(email, password);
      applySession(payload);
      return payload.user;
    },
    [applySession],
  );

  const signup = useCallback(
    async (name: string, email: string, password: string) => {
      const payload = await authApi.signup(name, email, password);
      applySession(payload);
      return payload.user as AuthUser;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    await runBeforeSignOut(); // save any unsent test answers to the account first
    try {
      applySession(await authApi.logout());
    } catch {
      setUser(null);
    } finally {
      clearAllPending(); // leave no answers behind on this device (shared computers)
    }
  }, [applySession]);

  const value = useMemo(
    () => ({ user, loading, googleEnabled, claimedResultRef, twoFactor, login, signup, logout, refresh, applySession }),
    [user, loading, googleEnabled, claimedResultRef, twoFactor, login, signup, logout, refresh, applySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
