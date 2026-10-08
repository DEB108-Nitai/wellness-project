import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

export interface PublicSettings {
  site_name: string;
  support_email: string;
  announcement_text: string;
  announcement_active: boolean;
  maintenance_mode: boolean;
  signup_open: boolean;
  challenge_registration_open: boolean;
  items_per_page: number;
  min_age: number;
}

const DEFAULTS: PublicSettings = {
  site_name: 'Transenigma',
  support_email: '',
  announcement_text: '',
  announcement_active: false,
  maintenance_mode: false,
  signup_open: true,
  challenge_registration_open: true,
  items_per_page: 7,
  min_age: 18,
};

interface SettingsState {
  settings: PublicSettings;
  loaded: boolean;
  refresh: () => Promise<void>;
}

const SettingsContext = createContext<SettingsState | null>(null);

/** Public site settings from GET /api/settings/public (PRD SITE-4/5). */
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setSettings({ ...DEFAULTS, ...(await api.get<Partial<PublicSettings>>('/settings/public')) });
    } catch {
      // keep defaults; the site stays usable
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ settings, loaded, refresh }), [settings, loaded, refresh]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}
