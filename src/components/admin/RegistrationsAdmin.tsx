import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { adminApi, REGISTRATION_STATUSES, RegistrationFilters, RegistrationStats, RegistrationStatus } from '../../api/admin';
import { ApiError } from '../../api/client';
import { CohortTiming, PROGRAMS, ProgramCode } from '../../api/challenge';
import { BarList, ChartCard, SERIES_COLORS, StackedColumns } from './charts';
import { RegistrationsTable } from './RegistrationsPanel';
import { ErrorBox, PageHeader, StatTile } from './ui';

/**
 * 60-Day registrations (owner ask: "very nicely depicted"; PRD ADM-4). One filter row scopes everything
 * below it: the tiles, the charts, the table and the CSV export.
 */
const ORDER: ProgramCode[] = ['STI', 'PTI', 'TTI'];
const TIMINGS: CohortTiming[] = ['morning', 'evening', 'weekend'];
type Range = 'all' | '7' | '30' | '90' | 'custom';

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => ymd(new Date(Date.now() - n * 86400000));
const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const control =
  'h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-hidden focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500';

export const RegistrationsAdmin: React.FC = () => {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [program, setProgram] = useState<ProgramCode | ''>('');
  const [status, setStatus] = useState<RegistrationStatus | ''>('');
  const [cohort, setCohort] = useState<CohortTiming | ''>('');
  const [range, setRange] = useState<Range>('all');
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(ymd(new Date()));
  const [stats, setStats] = useState<RegistrationStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const filters: RegistrationFilters = useMemo(() => {
    const dates =
      range === 'all' ? {} : range === 'custom' ? { from: from || undefined, to: to || undefined } : { from: daysAgo(Number(range) - 1), to: ymd(new Date()) };
    return { program: program || undefined, status: status || undefined, cohort: cohort || undefined, q: q || undefined, ...dates };
  }, [program, status, cohort, q, range, from, to]);
  const key = JSON.stringify(filters);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    adminApi
      .registrationStats(filters)
      .then((s) => alive && setStats(s))
      .catch((e) => alive && setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'Could not load the charts.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refresh]);

  const count = (pairs: RegistrationStats['byStatus'] | undefined, label: string) => pairs?.find((p) => p.label === label)?.count ?? 0;
  const active = stats ? count(stats.byStatus, 'registered') + count(stats.byStatus, 'confirmed') + count(stats.byStatus, 'waitlisted') : 0;
  const daysWithData = stats?.byDay.length ?? 0;
  const inDays = stats?.byDay.reduce((n, d) => n + ORDER.reduce((m, p) => m + d[p], 0), 0) ?? 0;
  const show = (v: number) => (stats ? v.toLocaleString() : '—');
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <PageHeader
        title="60-Day registrations"
        description="Who registered for the Sonic (STI), Philosophical (PTI) and Transcendental (TTI) programs. The filters apply to the numbers, the charts, the table and the CSV export."
      />

      {/* One filter row, above everything it scopes. */}
      <div className="flex flex-wrap gap-2 items-end" role="group" aria-label="Filters">
        <select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value as Range)} className={control}>
          <option value="all">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="custom">Custom dates…</option>
        </select>
        {range === 'custom' && (
          <>
            <label className="text-xs text-slate-500">
              <span className="sr-only">From</span>
              <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={control} aria-label="From date" />
            </label>
            <label className="text-xs text-slate-500">
              <span className="sr-only">To</span>
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={control} aria-label="To date" />
            </label>
          </>
        )}
        <select aria-label="Program" value={program} onChange={(e) => setProgram(e.target.value as ProgramCode | '')} className={control}>
          <option value="">All programs</option>
          {ORDER.map((c) => (
            <option key={c} value={c}>
              {PROGRAMS[c].short}
            </option>
          ))}
        </select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as RegistrationStatus | '')} className={control}>
          <option value="">All statuses</option>
          {REGISTRATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {cap(s)}
            </option>
          ))}
        </select>
        <select aria-label="Schedule" value={cohort} onChange={(e) => setCohort(e.target.value as CohortTiming | '')} className={control}>
          <option value="">All schedules</option>
          {TIMINGS.map((t) => (
            <option key={t} value={t}>
              {cap(t)}
            </option>
          ))}
        </select>
        <label className="relative flex-1 min-w-[14rem]">
          <span className="sr-only">Search registrations</span>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, email, phone, city or reference"
            className={`${control} w-full pl-10`}
          />
        </label>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      {/* Refetch keeps the frame: previous numbers stay, dimmed, while new ones load. */}
      <div className={`space-y-6 transition-opacity ${loading && stats ? 'opacity-60' : ''}`} aria-busy={loading}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label={filtered ? 'Registrations (filtered)' : 'All registrations'} value={show(stats?.total ?? 0)} />
          <StatTile label="Awaiting review" value={show(count(stats?.byStatus, 'registered'))} hint="Status “registered”" />
          <StatTile label="Confirmed" value={show(count(stats?.byStatus, 'confirmed'))} />
          <StatTile label="Active places" value={show(active)} hint="Registered, confirmed or waitlisted" />
        </div>

        {stats && (
          <>
            <ChartCard
              title="Registrations per day"
              subtitle={`${shortDay(stats.from)} – ${shortDay(stats.to)} (UTC) · ${inDays} in ${daysWithData} days${range === 'all' ? ' · last 30 days shown' : ''}`}
              table={{
                head: ['Day', ...ORDER, 'Total'],
                rows: stats.byDay.map((d) => [shortDay(d.day), ...ORDER.map((p) => d[p]), ORDER.reduce((n, p) => n + d[p], 0)]),
              }}
            >
              <StackedColumns data={stats.byDay} series={ORDER.map((p) => ({ key: p, label: PROGRAMS[p].short, color: SERIES_COLORS[p] }))} xLabel={shortDay} />
            </ChartCard>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {(
                [
                  [
                    'By program',
                    // Always STI → PTI → TTI (product rule), whatever order the server sends.
                    ORDER.map((code) => ({ label: PROGRAMS[code].short, count: stats.byProgram.find((p) => p.label === code)?.count ?? 0, color: SERIES_COLORS[code] })),
                  ],
                  ['By status', stats.byStatus.map((p) => ({ ...p, label: cap(p.label) }))],
                  ['By schedule', stats.byCohort.map((p) => ({ ...p, label: cap(p.label) }))],
                  ['Age', stats.ageBands],
                  ['What they struggle with', stats.struggles],
                  ['Top cities', stats.cities],
                ] as [string, { label: string; count: number; color?: string }[]][]
              ).map(([title, items]) => (
                <ChartCard key={title} title={title} table={{ head: [title === 'Age' ? 'Age band' : 'Group', 'Registrations'], rows: items.map((i) => [i.label, i.count]) }}>
                  <BarList items={items} total={title === 'What they struggle with' ? stats.total : undefined} />
                </ChartCard>
              ))}
            </div>
          </>
        )}
      </div>

      <RegistrationsTable filters={filters} onChanged={() => setRefresh((n) => n + 1)} />
    </div>
  );
};
