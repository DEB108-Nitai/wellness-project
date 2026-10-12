import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { assessmentApi, PendingResult, SessionState } from '../api/assessment';
import { useAuth } from './AuthContext';

interface ActiveSessionState {
  /** The visitor's in-progress assessment (guest cookie or account), or null. */
  active: SessionState | null;
  /** A guest's finished test waiting for an account, so it can't get lost after leaving the results gate. */
  pendingResult: PendingResult | null;
  /** 0–100, for "Continue (x%)" buttons. */
  progress: number;
  refresh: () => Promise<void>;
  /** "Start over": keeps the old answers on the server for research but marks them abandoned. */
  abandon: () => Promise<void>;
}

const ActiveSessionContext = createContext<ActiveSessionState | null>(null);

export const ActiveSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [active, setActive] = useState<SessionState | null>(null);
  const [pendingResult, setPendingResult] = useState<PendingResult | null>(null);

  const refresh = useCallback(async () => {
    const [current, pending] = await Promise.allSettled([assessmentApi.current(), assessmentApi.pendingResult()]);
    setActive(current.status === 'fulfilled' ? current.value : null);
    setPendingResult(pending.status === 'fulfilled' ? pending.value : null);
  }, []);

  // Re-check whenever the signed-in identity changes (guest sessions are claimed at sign-in).
  useEffect(() => {
    if (!loading) void refresh();
  }, [loading, user?.id, refresh]);

  const abandon = useCallback(async () => {
    await assessmentApi.abandon();
    setActive(null);
  }, []);

  const value = useMemo(() => {
    const progress = active && active.totalItems > 0 ? Math.round((active.answeredCount / active.totalItems) * 100) : 0;
    return { active, pendingResult, progress, refresh, abandon };
  }, [active, pendingResult, refresh, abandon]);

  return <ActiveSessionContext.Provider value={value}>{children}</ActiveSessionContext.Provider>;
};

export function useActiveSession(): ActiveSessionState {
  const ctx = useContext(ActiveSessionContext);
  if (!ctx) throw new Error('useActiveSession must be used inside <ActiveSessionProvider>');
  return ctx;
}
