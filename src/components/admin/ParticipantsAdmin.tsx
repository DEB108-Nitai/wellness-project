import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Download, Search } from 'lucide-react';
import { ParticipantFilters, ParticipantPage, participantsApi, SessionStatus } from '../../api/admin';
import { ApiError } from '../../api/client';
import { ChartCard, SINGLE, StackedColumns } from './charts';
import { Badge, ErrorBox, PageHeader, Pager, StatTile } from './ui';

/**
 * Participants & results (owner ask: test results against people's names; PRD ADM-2/3).
 * One filter row scopes the tiles, the chart, the table and both exports.
 */
type Range = 'all' | '7' | '30' | '90' | 'custom';
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => ymd(new Date(Date.now() - n * 86400000));
const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const fmtDateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export const STATUS_LABEL: Record<SessionStatus, { label: string; tone: 'teal' | 'indigo' | 'slate' | 'amber' }> = {
  completed: { label: 'Completed', tone: 'teal' },
  in_progress: { label: 'In progress', tone: 'indigo' },
  abandoned: { label: 'Restarted', tone: 'slate' },
  expired: { label: 'Expired', tone: 'amber' },
};

const control =
  'h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 focus:outline-hidden focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500';

export const ParticipantsAdmin: React.FC = () => {
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<SessionStatus | ''>('');
  const [flag, setFlag] = useState<'' | 'yes' | 'no'>('');
  const [account, setAccount] = useState<'' | 'user' | 'guest'>('');
  const [country, setCountry] = useState('');
  const [range, setRange] = useState<Range>('all');
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(ymd(new Date()));
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ParticipantPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const filters: ParticipantFilters = useMemo(() => {
    const dates =
      range === 'all' ? {} : range === 'custom' ? { from: from || undefined, to: to || undefined } : { from: daysAgo(Number(range) - 1), to: ymd(new Date()) };
    return {
      status: status || undefined,
      flagged: flag === '' ? undefined : flag === 'yes',
      account: account || undefined,
      country: /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : undefined,
      q: q || undefined,
      ...dates,
    };
  }, [status, flag, account, country, q, range, from, to]);
  const key = JSON.stringify(filters);
  useEffect(() => setPage(1), [key]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    participantsApi
      .list({ ...filters, page, perPage: 25 })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'Could not load the assessments.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page]);

  const completed = data?.byStatus.completed ?? 0;
  const rate = data && data.total ? Math.round((completed / data.total) * 100) : 0;
  const show = (v: number | string) => (data ? v : '—');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Participants & results"
        description="Every 16PF assessment, with the person behind it: the account name and email, or “Guest” and the nickname. Open one to see all 16 factors, the 5 domains and every answer."
        actions={
          <>
            <a href={participantsApi.csvUrl(filters, false)} className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700">
              <Download className="w-4 h-4" aria-hidden="true" /> Scores CSV
            </a>
            <a href={participantsApi.csvUrl(filters, true)} className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm font-semibold text-white">
              <Download className="w-4 h-4" aria-hidden="true" /> With all answers
            </a>
          </>
        }
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
        <select aria-label="Date range (start date)" value={range} onChange={(e) => setRange(e.target.value as Range)} className={control}>
          <option value="all">All time</option>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="custom">Custom dates…</option>
        </select>
        {range === 'custom' && (
          <>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={control} aria-label="From date" />
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={control} aria-label="To date" />
          </>
        )}
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as SessionStatus | '')} className={control}>
          <option value="">All statuses</option>
          {(Object.keys(STATUS_LABEL) as SessionStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s].label}
            </option>
          ))}
        </select>
        <select aria-label="Quality" value={flag} onChange={(e) => setFlag(e.target.value as '' | 'yes' | 'no')} className={control}>
          <option value="">Any quality</option>
          <option value="yes">Flagged for review</option>
          <option value="no">Not flagged</option>
        </select>
        <select aria-label="Account" value={account} onChange={(e) => setAccount(e.target.value as '' | 'user' | 'guest')} className={control}>
          <option value="">Accounts and guests</option>
          <option value="user">With an account</option>
          <option value="guest">Guests only</option>
        </select>
        <input
          aria-label="Country code"
          value={country}
          maxLength={2}
          onChange={(e) => setCountry(e.target.value.replace(/[^a-z]/gi, ''))}
          placeholder="Country (IN)"
          className={`${control} w-32 uppercase placeholder:normal-case`}
        />
        <label className="relative flex-1 min-w-[14rem]">
          <span className="sr-only">Search assessments</span>
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, email, nickname or reference (TE-…)" className={`${control} w-full pl-10`} />
        </label>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}

      <div className={`space-y-6 transition-opacity ${loading && data ? 'opacity-60' : ''}`} aria-busy={loading}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Assessments started" value={show(data?.total ?? 0)} />
          <StatTile label="Completed" value={show(completed)} hint={data ? `${rate}% completion rate` : undefined} />
          <StatTile label="In progress" value={show(data?.byStatus.in_progress ?? 0)} hint="Not submitted yet" />
          <StatTile label="Flagged for review" value={show(data?.flagged ?? 0)} hint="Failed attention checks, same answers or too fast" />
        </div>

        {data && (
          <ChartCard
            title="Assessments started per day"
            subtitle={`${shortDay(data.from)} – ${shortDay(data.to)} (UTC)${range === 'all' ? ' · last 30 days shown' : ''} · the table also shows how many of them were completed`}
            table={{ head: ['Day', 'Started', 'Of those, completed'], rows: data.byDay.map((d) => [shortDay(d.day), d.started, d.completed]) }}
          >
            <StackedColumns data={data.byDay.map((d) => ({ day: d.day, started: d.started }))} series={[{ key: 'started', label: 'Started', color: SINGLE }]} xLabel={shortDay} />
          </ChartCard>
        )}

        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs" aria-label="Assessments">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Assessments {data && <span className="font-medium text-slate-400">({data.total})</span>}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Person</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Started</th>
                  <th className="py-3 px-4">Strongest traits</th>
                  <th className="py-3 px-4">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.items.map((r) => (
                  <tr key={r.ref} className="hover:bg-slate-50/60 align-top">
                    <td className="py-3 px-4">
                      {r.person ? (
                        <>
                          <div className="font-semibold text-slate-900">{r.person.name}</div>
                          <div className="text-[11px] text-slate-500">{r.person.email ?? 'Anonymised account'}</div>
                        </>
                      ) : (
                        <>
                          <div className="font-semibold text-slate-700">Guest{r.nickname ? ` · ${r.nickname}` : ''}</div>
                          <div className="text-[11px] text-slate-400">No account yet</div>
                        </>
                      )}
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">{r.ref}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge tone={STATUS_LABEL[r.status].tone}>{STATUS_LABEL[r.status].label}</Badge>
                      {r.flagged && (
                        <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                          <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Flagged
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                      {r.answeredCount}/{r.totalItems}
                      <div className="text-[11px] text-slate-400">{r.activeMinutes} min</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                      {fmtDateTime(r.startedAt)}
                      {r.completedAt && <div className="text-[11px] text-slate-400">Done {fmtDateTime(r.completedAt)}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {r.topTraits.length === 0 && <span className="text-slate-400">—</span>}
                        {r.topTraits.map((t) => (
                          <span key={t.code} className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]" title={`${t.name}: sten ${t.sten}`}>
                            {t.name} <strong className="tabular-nums">{t.sten}</strong>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link to={`/admin/participants/${r.ref}`} className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {data && data.items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No assessments match these filters.
                    </td>
                  </tr>
                )}
                {!data && !error && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {data && <Pager page={data.page} perPage={data.perPage} total={data.total} onPage={setPage} />}
        </section>
      </div>
    </div>
  );
};
