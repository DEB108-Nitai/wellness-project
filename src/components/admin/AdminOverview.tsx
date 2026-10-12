import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';
import { AUDIT_LABELS, Dashboard, dashboardApi } from '../../api/admin';
import { PROGRAMS, ProgramCode } from '../../api/challenge';
import { useContentStats } from '../../hooks/useContentStats';
import { BarList, SERIES_COLORS, SINGLE, StackedColumns } from './charts';
import { ErrorBox, LoadingBlock, PageHeader, Panel, StatTile } from './ui';

/** Admin home (PRD ADM-1): the numbers that matter today, each linking to its section. */
const ORDER: ProgramCode[] = ['STI', 'PTI', 'TTI'];
const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' });
const ago = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} h ago` : new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

const SectionLink: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => (
  <Link to={to} className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800">
    {children} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
  </Link>
);

export const AdminOverview: React.FC = () => {
  const [d, setD] = useState<Dashboard | null>(null);
  const [error, setError] = useState(false);
  const { stats } = useContentStats();

  useEffect(() => {
    dashboardApi
      .get()
      .then(setD)
      .catch(() => setError(true));
  }, []);

  if (error) return <ErrorBox onRetry={() => window.location.reload()}>Could not load the overview.</ErrorBox>;
  if (!d) return <LoadingBlock />;

  const regTotal = (code: ProgramCode) => Object.values(d.registrations[code] ?? {}).reduce((a, b) => a + (b ?? 0), 0);
  const awaiting = ORDER.reduce((n, c) => n + (d.registrations[c]?.registered ?? 0), 0);

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" description="Today at a glance. Every number links to its section." />

      {d.messages.new > 0 && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-900">
          <Mail className="w-4 h-4 shrink-0" aria-hidden="true" />
          {d.messages.new} new contact {d.messages.new === 1 ? 'message' : 'messages'} waiting for a reply.
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Visitors today" value={d.visitors.today} hint={`${d.visitors.last7} in the last 7 days`} />
        <StatTile label="Tests completed, 30 days" value={d.tests.last30.completed} hint={`${d.tests.last30.completionRate}% of ${d.tests.last30.started} started`} />
        <StatTile label="New accounts, 30 days" value={d.users.last30} hint={`${d.users.total} accounts in total`} />
        <StatTile label="Registrations awaiting review" value={awaiting} hint="Status “registered”" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Panel title="Visitors, last 7 days" actions={<SectionLink to="/admin/visitors">Visitors</SectionLink>}>
          <StackedColumns data={d.visitors.byDay} series={[{ key: 'visitors', label: 'Visitors', color: SINGLE }]} xLabel={shortDay} />
        </Panel>

        <Panel title="16PF assessments" actions={<SectionLink to="/admin/participants">Participants</SectionLink>}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500">
                <th className="pb-2 font-semibold" />
                <th className="pb-2 font-semibold text-right">7 days</th>
                <th className="pb-2 font-semibold text-right">30 days</th>
                <th className="pb-2 font-semibold text-right">All time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(
                [
                  ['Started', 'started'],
                  ['Completed', 'completed'],
                  ['Completion rate', 'completionRate'],
                  ['Flagged for review', 'flagged'],
                ] as const
              ).map(([label, key]) => (
                <tr key={key}>
                  <td className="py-2 text-slate-600">{label}</td>
                  {(['last7', 'last30', 'allTime'] as const).map((p) => (
                    <td key={p} className="py-2 text-right font-semibold text-slate-900 tabular-nums">
                      {d.tests[p][key]}
                      {key === 'completionRate' ? '%' : ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="60-Day registrations" actions={<SectionLink to="/admin/registrations">All</SectionLink>}>
          <BarList items={ORDER.map((c) => ({ label: PROGRAMS[c].short, count: regTotal(c), color: SERIES_COLORS[c] }))} empty="No registrations yet." />
        </Panel>
        <Panel title="Content on the site">
          <ul className="space-y-2 text-sm">
            {[
              ['Research papers', stats?.publications, '/admin/research'],
              ['Research fields', stats?.researchFields, '/admin/research'],
              ['Client projects', stats?.clientProjects, '/admin/consultancy'],
            ].map(([label, value, to]) => (
              <li key={String(label)}>
                <Link to={String(to)} className="flex items-center justify-between rounded-lg px-2 py-1.5 -mx-2 hover:bg-slate-50">
                  <span className="text-slate-600">{label}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{value ?? '—'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="People">
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-slate-600">Accounts</span>
              <span className="font-semibold text-slate-900 tabular-nums">{d.users.total}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-600">New in the last 7 days</span>
              <span className="font-semibold text-slate-900 tabular-nums">{d.users.last7}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-600">Admins</span>
              <span className="font-semibold text-slate-900 tabular-nums">{d.users.admins}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-slate-600">Newsletter subscribers</span>
              <span className="font-semibold text-slate-900 tabular-nums">{d.subscribers}</span>
            </li>
          </ul>
        </Panel>
      </div>

      <Panel title="Recent activity">
        {d.recentActivity.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {d.recentActivity.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold text-slate-900">{a.actorName ?? (a.actorType === 'guest' ? 'A visitor' : 'System')}</span>{' '}
                  <span className="text-slate-600">{(AUDIT_LABELS[a.action] ?? a.action.replace(/_/g, ' ').toLowerCase()).replace(/^./, (c) => c.toLowerCase())}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">{ago(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
};
