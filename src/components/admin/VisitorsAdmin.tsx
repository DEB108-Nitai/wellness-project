import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { VisitorMetrics, visitorsApi } from '../../api/admin';
import { ApiError } from '../../api/client';
import { BarList, ChartCard, SINGLE, StackedColumns } from './charts';
import { ErrorBox, LoadingBlock, PageHeader, StatTile } from './ui';

/**
 * Visitors (owner ask: daily users and average visits), from our own private counter: no cookies, no
 * Google, no IP stored. One person counts once per day.
 */
const shortDay = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
const ACTIVITY = '#6366f1';
/** Readable names for counted paths ("/results/*" stands for any personal report). */
const pageName = (path: string) => ({ '/': 'Home', '/results/*': 'Result reports', '/r/*': 'Shared reports' })[path] ?? path;

export const VisitorsAdmin: React.FC = () => {
  const [days, setDays] = useState(30);
  const [m, setM] = useState<VisitorMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    visitorsApi
      .metrics(days)
      .then((r) => alive && setM(r))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Could not load the visitor numbers.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [days]);

  if (!m && !error) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visitors"
        description="How many people visit the site and what they do. Counted privately: no cookies, no Google, and no IP address is stored."
        actions={
          <select aria-label="Period" value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        }
      />
      {error && <ErrorBox>{error}</ErrorBox>}

      {m && (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatTile label="Visitors today" value={m.today.visitors.toLocaleString()} hint={`${m.today.views.toLocaleString()} pages viewed`} />
            <StatTile label="Visitors, last 7 days" value={m.last7.visitors.toLocaleString()} hint={`${m.last7.views.toLocaleString()} pages viewed`} />
            <StatTile label="Average visitors per day" value={m.period.averageDailyVisitors.toLocaleString()} hint={`over the last ${m.days} days`} />
            <StatTile label="Pages per visit" value={m.period.viewsPerVisit.toLocaleString()} hint={`${m.period.views.toLocaleString()} pages in ${m.days} days`} />
          </div>

          <ChartCard
            title="Visitors per day"
            subtitle={`${shortDay(m.from)} – today · each person counted once a day`}
            table={{ head: ['Day', 'Visitors', 'Pages viewed', 'Signed in'], rows: m.byDay.map((d) => [shortDay(d.day), d.visitors, d.views, d.signedIn]) }}
          >
            <StackedColumns data={m.byDay.map((d) => ({ day: d.day, visitors: d.visitors }))} series={[{ key: 'visitors', label: 'Visitors', color: SINGLE }]} xLabel={shortDay} />
          </ChartCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Most viewed pages" subtitle="Pages viewed in the period" table={{ head: ['Page', 'Views', 'Visitors'], rows: m.topPages.map((p) => [pageName(p.label), p.views, p.visitors]) }}>
              <BarList items={m.topPages.map((p) => ({ label: pageName(p.label), count: p.views }))} empty="No page views yet." />
            </ChartCard>
            <ChartCard title="Where visitors came from" subtitle="Other websites that sent visitors (search engines, social media…)" table={{ head: ['Website', 'Visitors'], rows: m.referrers.map((r) => [r.label, r.count]) }}>
              <BarList items={m.referrers} empty="No visits from other websites yet. Visitors who type the address or use a bookmark aren't listed here." />
            </ChartCard>
          </div>

          <ChartCard
            title="What visitors did"
            subtitle={`In the last ${m.days} days: ${m.period.signups} new accounts, ${m.period.testsCompleted} tests completed`}
            table={{
              head: ['Day', 'New accounts', 'Tests started', 'Tests completed', '60-day registrations', 'Signed-in visitors'],
              rows: m.byDay.map((d) => [shortDay(d.day), d.signups, d.testsStarted, d.testsCompleted, d.registrations, d.signedIn]),
            }}
          >
            <BarList
              items={[
                { label: 'New accounts', count: m.byDay.reduce((n, d) => n + d.signups, 0), color: ACTIVITY },
                { label: 'Tests started', count: m.byDay.reduce((n, d) => n + d.testsStarted, 0), color: ACTIVITY },
                { label: 'Tests completed', count: m.byDay.reduce((n, d) => n + d.testsCompleted, 0), color: ACTIVITY },
                { label: '60-day registrations', count: m.byDay.reduce((n, d) => n + d.registrations, 0), color: ACTIVITY },
              ]}
              empty="Nothing yet in this period."
              showShare={false}
            />
          </ChartCard>

          <p className="flex items-start gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" aria-hidden="true" />
            Visitors are counted with a code that changes every day, so the same person is never followed from one day to the next. Admin pages, automated
            browsers and browsers that ask not to be tracked are not counted. Page-by-page detail is kept for {m.rawDays} days; daily totals are kept for good.
          </p>
        </div>
      )}
    </div>
  );
};
