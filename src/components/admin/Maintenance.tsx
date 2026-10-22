import React, { useState } from 'react';
import { AlertTriangle, Loader2, Power } from 'lucide-react';
import { ApiError } from '../../api/client';
import { adminApi } from '../../api/admin';
import { useSettings } from '../../context/SettingsContext';
import { btn, ConfirmDialog, ErrorBox } from './ui';

/**
 * Maintenance mode is switched on its own, saved at once (never through the Settings form's Save button, which
 * once made it easy to tick the box, leave, and believe the site was closed). While it is on, every admin page
 * shows a red bar with a Turn off button.
 */
function useMaintenanceSwitch() {
  const { settings, refresh } = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = async (on: boolean): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateSettings({ maintenance_mode: on });
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not change maintenance mode. Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { on: settings.maintenance_mode, busy, error, set };
}

export const MaintenanceBar: React.FC = () => {
  const { on, busy, error, set } = useMaintenanceSwitch();
  if (!on) return null;
  return (
    <div role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
      <div className="flex flex-wrap items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" aria-hidden="true" />
        <p className="flex-1 min-w-[12rem]">
          <strong>Maintenance mode is ON:</strong> visitors can't use the site. Turn it off as soon as you're done.
        </p>
        <button type="button" onClick={() => void set(false)} disabled={busy} className={btn.danger}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Power className="w-4 h-4" aria-hidden="true" />}
          Turn off
        </button>
      </div>
      {error && <p className="mt-2 text-rose-700">{error}</p>}
    </div>
  );
};

export const MaintenanceCard: React.FC = () => {
  const { on, busy, error, set } = useMaintenanceSwitch();
  const [confirming, setConfirming] = useState(false);
  return (
    <section aria-labelledby="maintenance-title" className={`rounded-3xl border p-6 sm:p-8 max-w-3xl ${on ? 'border-rose-200 bg-rose-50' : 'border-slate-200 bg-white shadow-sm'}`}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-[14rem] space-y-1">
          <h2 id="maintenance-title" className="text-lg font-bold text-slate-900 font-heading">
            Maintenance mode: <span className={on ? 'text-rose-700' : 'text-teal-700'}>{on ? 'ON' : 'off'}</span>
          </h2>
          <p className="text-xs text-slate-600">
            {on
              ? "Visitors see a maintenance page: they can't take the test, register or send messages. Admins keep access."
              : 'Use it while the site is being updated. It takes effect immediately; no need to press Save.'}
          </p>
        </div>
        {on ? (
          <button type="button" onClick={() => void set(false)} disabled={busy} className={btn.danger}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            Turn off
          </button>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} disabled={busy} className={btn.secondary}>
            <Power className="w-4 h-4" aria-hidden="true" /> Turn on…
          </button>
        )}
      </div>
      {error && !confirming && <div className="mt-4"><ErrorBox>{error}</ErrorBox></div>}
      {confirming && (
        <ConfirmDialog
          title="Turn maintenance mode on?"
          message="Visitors will see a maintenance page until you turn it off. Tests in progress pause and continue where they were afterwards; registrations and messages wait too. Admins keep access."
          confirmLabel="Turn on"
          busy={busy}
          error={error}
          onCancel={() => setConfirming(false)}
          onConfirm={async () => {
            if (await set(true)) setConfirming(false);
          }}
        />
      )}
    </section>
  );
};
