import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { adminApi, RegistrationPage } from '../../api/admin';
import { PROGRAMS, ProgramCode } from '../../api/challenge';
import { useContentStats } from '../../hooks/useContentStats';
import { PROGRAM_BADGE } from './RegistrationsPanel';
import { PageHeader, Panel, StatTile } from './ui';

/** Admin home. The full dashboard (tests, visitors, users, audit) is built in Phase 5 slice E. */
export const AdminOverview: React.FC = () => {
  const [regs, setRegs] = useState<RegistrationPage | null>(null);
  const [failed, setFailed] = useState(false);
  const { stats } = useContentStats();

  useEffect(() => {
    adminApi.registrations({ perPage: 5 }).then(setRegs).catch(() => setFailed(true));
  }, []);

  const programTotal = (code: ProgramCode) => Object.values(regs?.counts[code] ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  const awaiting = (['STI', 'PTI', 'TTI'] as ProgramCode[]).reduce((n, c) => n + (regs?.counts[c]?.registered ?? 0), 0);
  const show = (v: number) => (regs ? v : '—');

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" description="A quick look at registrations and the content on the site." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(['STI', 'PTI', 'TTI'] as ProgramCode[]).map((code) => (
          <StatTile key={code} label={`${PROGRAMS[code].short} registrations`} value={show(programTotal(code))} />
        ))}
        <StatTile label="Awaiting review" value={show(awaiting)} hint="Status “registered”" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Latest 60-Day registrations"
          actions={
            <Link to="/admin/registrations" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800">
              View all <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          }
        >
          {failed ? (
            <p className="text-sm text-rose-600">Could not load registrations.</p>
          ) : regs && regs.items.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {regs.items.map((r) => (
                <li key={r.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-900 block truncate">{r.name}</span>
                    <span className="text-xs text-slate-500 truncate block">{r.email}</span>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-full border text-[11px] font-bold ${PROGRAM_BADGE[r.program]}`}>{r.program}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">{regs ? 'No registrations yet.' : 'Loading…'}</p>
          )}
        </Panel>

        <Panel title="Content on the site">
          <ul className="grid grid-cols-3 gap-3 text-center">
            {[
              ['Research papers', stats?.publications, '/admin/research'],
              ['Research fields', stats?.researchFields, '/admin/research'],
              ['Client projects', stats?.clientProjects, '/admin/consultancy'],
            ].map(([label, value, to]) => (
              <li key={String(label)}>
                <Link to={String(to)} className="block rounded-xl border border-slate-200 p-3 hover:border-teal-300 hover:bg-teal-50/40 transition-colors">
                  <span className="block text-2xl font-bold text-slate-900 font-heading tabular-nums">{value ?? '—'}</span>
                  <span className="block text-xs text-slate-500">{label}</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">These numbers appear on the home page and update as soon as content changes.</p>
        </Panel>
      </div>
    </div>
  );
};
