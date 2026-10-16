import React, { useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Paged, siteAdminApi, SubscriberRow, SubscriberStatus } from '../../api/admin';
import { ApiError } from '../../api/client';
import { Badge, btn, EmptyState, ErrorBox, filterControl, fmtWhen, LoadingBlock, PageHeader, Pager, StatTile, useClampPage, useDebounced } from './ui';

/** Newsletter subscribers (PRD ADM-3): who signed up from the footer, who left, and a CSV for the mailing tool. */
type Data = Paged<SubscriberRow> & { counts: { subscribed: number; unsubscribed: number; last30Days: number } };

export const SubscribersAdmin: React.FC = () => {
  const [status, setStatus] = useState<SubscriberStatus | ''>('subscribed');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filters = useMemo(() => ({ status: status || undefined, q: q || undefined }), [status, q]);
  const key = JSON.stringify(filters);
  useEffect(() => setPage(1), [key]);
  useClampPage(data, setPage);

  useEffect(() => {
    let alive = true;
    setError(null);
    siteAdminApi
      .subscribers({ ...filters, page })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Could not load the subscribers.'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newsletter subscribers"
        description="People who subscribed with the form in the site footer. Export the list for your mailing tool, and only email people marked Subscribed."
        actions={
          <a href={siteAdminApi.subscribersCsvUrl(filters)} className={btn.secondary}>
            <Download className="w-4 h-4" aria-hidden="true" /> Export CSV
          </a>
        }
      />
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <StatTile label="Subscribed now" value={data ? data.counts.subscribed : '—'} />
        <StatTile label="New in the last 30 days" value={data ? data.counts.last30Days : '—'} />
        <StatTile label="Unsubscribed" value={data ? data.counts.unsubscribed : '—'} />
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="relative flex-1 min-w-[14rem]">
          <span className="sr-only">Search by email</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by email" className={`${filterControl} w-full pl-9`} />
        </label>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as SubscriberStatus | '')} className={filterControl}>
          <option value="subscribed">Subscribed</option>
          <option value="unsubscribed">Unsubscribed</option>
          <option value="">Everyone</option>
        </select>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
      {!data && !error && <LoadingBlock />}
      {data && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" aria-label="Subscribers">
          {data.items.length === 0 ? (
            <EmptyState title="Nobody matches these filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 bg-slate-50">
                  <tr>
                    <th className="py-2.5 px-5 font-semibold">Email</th>
                    <th className="py-2.5 pr-3 font-semibold">Status</th>
                    <th className="py-2.5 pr-5 font-semibold whitespace-nowrap">Subscribed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3 px-5 text-slate-800 break-all">{s.email}</td>
                      <td className="py-3 pr-3">
                        {s.status === 'subscribed' ? <Badge tone="teal">Subscribed</Badge> : <Badge>Unsubscribed {s.unsubscribedAt ? new Date(s.unsubscribedAt).toLocaleDateString() : ''}</Badge>}
                      </td>
                      <td className="py-3 pr-5 text-slate-500 whitespace-nowrap">{fmtWhen(s.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager page={data.page} perPage={data.perPage} total={data.total} onPage={setPage} />
        </section>
      )}
    </div>
  );
};
