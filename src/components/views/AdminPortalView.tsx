import React, { useEffect, useState } from 'react';
import { BarChart3, Sparkles } from 'lucide-react';
import { adminApi, RegistrationPage } from '../../api/admin';
import { PROGRAMS, ProgramCode } from '../../api/challenge';
import { useSettings } from '../../context/SettingsContext';
import { PROGRAM_BADGE, RegistrationsPanel } from '../admin/RegistrationsPanel';
import { SettingsPanel } from '../admin/SettingsPanel';

interface AdminPortalViewProps {
  onNavigate: (view: string) => void;
}

type Tab = 'dashboard' | 'participants' | 'challenge-regs' | 'questions' | 'settings' | 'audit';

/** Shown for areas that move to server data in Phase 5. */
const Phase5Notice: React.FC<{ title: string; text: string }> = ({ title, text }) => (
  <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-2">
    <h2 className="text-lg font-bold text-slate-900 font-heading">{title}</h2>
    <p className="text-sm text-slate-500 max-w-lg mx-auto">{text}</p>
  </div>
);

/**
 * Admin console. Access is enforced by <RequireAdmin> on the route and by the API on every admin endpoint.
 * Phase 4: registrations + settings run on server data; the rest of the console is rebuilt in Phase 5.
 */
export const AdminPortalView: React.FC<AdminPortalViewProps> = ({ onNavigate }) => {
  const { settings } = useSettings();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [overview, setOverview] = useState<RegistrationPage | null>(null);

  useEffect(() => {
    if (tab === 'dashboard') {
      adminApi.registrations({ perPage: 5 }).then(setOverview).catch(() => setOverview(null));
    }
  }, [tab]);

  const programTotal = (code: ProgramCode) => Object.values(overview?.counts[code] ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  const newCount = (['STI', 'PTI', 'TTI'] as ProgramCode[]).reduce((n, c) => n + (overview?.counts[c]?.registered ?? 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 pb-28">
      {/* HEADER */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono text-teal-400 bg-slate-800 px-2.5 py-0.5 rounded">ADMIN CONSOLE · TRANSENIGMA</span>
            {settings.maintenance_mode && (
              <span className="text-xs font-bold text-rose-300 bg-rose-900/60 px-2 py-0.5 rounded border border-rose-700">MAINTENANCE MODE ACTIVE</span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading">Transenigma Platform Administration</h1>
          <p className="text-xs sm:text-sm text-slate-400">Assessments, 60-day challenge registrations and platform settings.</p>
        </div>
        <button
          onClick={() => onNavigate('landing')}
          className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer border border-slate-700"
        >
          ← Exit to Site
        </button>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3" role="tablist">
        {(
          [
            ['dashboard', 'Overview'],
            ['participants', 'Participants & Sten Data'],
            ['challenge-regs', '60-Day Challenge Registrations'],
            ['questions', 'Question Set & Norms'],
            ['settings', 'System Settings'],
            ['audit', 'Audit Log'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${tab === id ? 'bg-indigo-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {(['STI', 'PTI', 'TTI'] as ProgramCode[]).map((code) => (
              <div key={code} className={`p-5 rounded-2xl border shadow-xs space-y-1 ${PROGRAM_BADGE[code]}`}>
                <span className="text-xs font-medium">{PROGRAMS[code].short} registrations</span>
                <h3 className="text-2xl font-bold font-mono">{overview ? programTotal(code) : '—'}</h3>
              </div>
            ))}
            <div className="p-5 rounded-2xl border border-sky-200 bg-sky-50 text-sky-900 shadow-xs space-y-1">
              <span className="text-xs font-medium">Awaiting review</span>
              <h3 className="text-2xl font-bold font-mono">{overview ? newCount : '—'}</h3>
              <span className="text-[11px]">Status “registered”</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600" /> Latest 60-Day registrations
                </h3>
                <button onClick={() => setTab('challenge-regs')} className="text-xs font-semibold text-indigo-700 hover:underline cursor-pointer">
                  View all →
                </button>
              </div>
              {overview && overview.items.length > 0 ? (
                <ul className="space-y-2">
                  {overview.items.map((r) => (
                    <li key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 block truncate">{r.name}</span>
                        <span className="text-[11px] text-slate-500 truncate block">{r.email}</span>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-bold ${PROGRAM_BADGE[r.program]}`}>{r.program}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No registrations yet.</p>
              )}
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" /> Assessment statistics
              </h3>
              <p className="text-xs text-slate-500">
                Tests started and completed, completion rate, quality flags and the latest audit events arrive with the full server-backed
                console in Phase 5.
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === 'participants' && (
        <Phase5Notice
          title="Participants & Sten Data"
          text="Assessments are stored securely on the server. Search, filters, score inspection and exports are rebuilt on that data in Phase 5."
        />
      )}
      {tab === 'challenge-regs' && <RegistrationsPanel />}
      {tab === 'questions' && (
        <Phase5Notice title="Question Set & Norms" text="A read-only view of the 166-item set, its scoring key and the norm tables arrives in Phase 5." />
      )}
      {tab === 'settings' && <SettingsPanel />}
      {tab === 'audit' && (
        <Phase5Notice
          title="Audit Log"
          text="Every sign-in, registration, settings change and export is already being recorded on the server. The searchable audit view arrives in Phase 5."
        />
      )}
    </div>
  );
};
