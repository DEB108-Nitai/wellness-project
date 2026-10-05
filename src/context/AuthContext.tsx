import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, AuthUser, SessionPayload } from '../api/auth';
import { storage } from '../services/storageService';

interface AuthState {
  user: AuthUser | null;
  /** True until the first /auth/me response arrives. */
  loading: boolean;
  googleEnabled: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** Apply a session payload returned by any auth/account endpoint. */
  applySession: (payload: SessionPayload) => void;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Mirrors the signed-in user into the legacy browser store so the assessment
 * flow keeps attaching drafts to the right person until it moves to the API (Phase 3).
 */
function mirrorToLegacyStore(user: AuthUser | null): void {
  storage.setCurrentUser(
    user ? { id: String(user.id), name: user.name, email: user.email, role: user.role, createdAt: user.createdAt ?? '' } : null,
  );
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [googleEnabled, setGoogleEnabled] = useState(false);

  const applySession = useCallback((payload: SessionPayload) => {
    setUser(payload.user);
    setGoogleEnabled(payload.googleEnabled);
    mirrorToLegacyStore(payload.user);
  }, []);

  const refresh = useCallback(async () => {
    try {
      applySession(await authApi.me());
    } catch {
      // Network/server problem: keep the UI usable as a signed-out visitor.
      setUser(null);
      mirrorToLegacyStore(null);
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
      return payload.user as AuthUser;
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
    try {
      applySession(await authApi.logout());
    } catch {
      setUser(null);
      mirrorToLegacyStore(null);
    }
  }, [applySession]);

  const value = useMemo(
    () => ({ user, loading, googleEnabled, login, signup, logout, refresh, applySession }),
    [user, loading, googleEnabled, login, signup, logout, refresh, applySession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
