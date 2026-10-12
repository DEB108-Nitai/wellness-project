import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { AUDIT_LABELS, AuditFilters, AuditRow, Paged, siteAdminApi } from '../../api/admin';
import { ApiError } from '../../api/client';
import { Badge, EmptyState, ErrorBox, filterControl, fmtWhen, LoadingBlock, PageHeader, Pager, RangeChoice, RangePicker, rangeDates, useClampPage, useDebounced } from './ui';

/**
 * The audit log (PRD ADM-10): who did what, when. Read-only: nothing here (or anywhere in the API) can edit
 * or delete an entry. IP addresses are never stored, only a keyed hash.
 */
type Data = Paged<AuditRow> & { actions: string[] };

const ACTOR_TONE = { admin: 'indigo', user: 'teal', guest: 'slate', system: 'amber' } as const;

/** Details in plain words: short values inline, lists joined; nothing nested is dropped silently. */
function detailText(d: Record<string, unknown> | null): string {
  if (!d) return '';
  return Object.entries(d)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}`)
    .join(' · ');
}

const Entity: React.FC<{ row: AuditRow }> = ({ row }) => {
  // Exports and list-wide changes are fully described by the action itself.
  if (!row.entityType || row.entityType === 'export' || row.entityType === 'faq_list') return null;
  if (row.entityType === 'test_session' && row.entityId) {
    return (
      <Link to={`/admin/participants/${row.entityId}`} className="text-teal-700 hover:underline font-mono">
        {row.entityId}
      </Link>
    );
  }
  return (
    <span className="text-slate-500">
      {row.entityType.replace(/_/g, ' ')}
      {row.entityId ? ` #${row.entityId}` : ''}
    </span>
  );
};

export const AuditAdmin: React.FC = () => {
  const [action, setAction] = useState('');
  const [actorType, setActorType] = useState<AuditFilters['actorType'] | ''>('');
  const [search, setSearch] = useState('');
  const actor = useDebounced(search);
  const [range, setRange] = useState<{ range: RangeChoice; from: string; to: string }>({ range: '30', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filters: AuditFilters = useMemo(
    () => ({ action: action || undefined, actorType: actorType || undefined, actor: actor || undefined, ...rangeDates(range.range, range.from, range.to) }),
    [action, actorType, actor, range],
  );
  const key = JSON.stringify(filters);
  useEffect(() => setPage(1), [key]);
  useClampPage(data, setPage);

  useEffect(() => {
    let alive = true;
    setError(null);
    siteAdminApi
      .audit({ ...filters, page })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'Could not load the audit log.'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Every sign-in, security change, export and admin change, newest first. Entries can’t be edited or deleted. Times are shown in your local time."
      />
      <div className="flex flex-wrap gap-2">
        <label className="relative flex-1 min-w-[14rem]">
          <span className="sr-only">Search by person</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Person’s name or email" className={`${filterControl} w-full pl-9`} />
        </label>
        <select aria-label="Action" value={action} onChange={(e) => setAction(e.target.value)} className={`${filterControl} max-w-[16rem]`}>
          <option value="">All actions</option>
          {(data?.actions ?? []).map((a) => (
            <option key={a} value={a}>
              {AUDIT_LABELS[a] ?? a}
            </option>
          ))}
        </select>
        <select aria-label="Who" value={actorType} onChange={(e) => setActorType(e.target.value as AuditFilters['actorType'] | '')} className={filterControl}>
          <option value="">Everyone</option>
          <option value="admin">Admins</option>
          <option value="user">Members</option>
          <option value="guest">Visitors</option>
          <option value="system">Server</option>
        </select>
        <RangePicker {...range} onChange={setRange} />
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
      {!data && !error && <LoadingBlock />}
      {data && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" aria-label="Audit entries">
          {data.items.length === 0 ? (
            <EmptyState title="No entries match these filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 bg-slate-50">
                  <tr>
                    <th className="py-2.5 px-5 font-semibold whitespace-nowrap">When</th>
                    <th className="py-2.5 pr-3 font-semibold">Who</th>
                    <th className="py-2.5 pr-3 font-semibold">What</th>
                    <th className="py-2.5 pr-5 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 align-top">
                  {data.items.map((a) => (
                    <tr key={a.id}>
                      <td className="py-3 px-5 text-xs text-slate-500 whitespace-nowrap">{fmtWhen(a.createdAt)}</td>
                      <td className="py-3 pr-3 min-w-[11rem]">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-800 font-medium">{a.actor ? a.actor.name : a.actorType === 'system' ? 'Server' : 'Visitor'}</span>
                          {a.actor && <span className="text-xs text-slate-500 break-all">{a.actor.email}</span>}
                          <span>
                            <Badge tone={ACTOR_TONE[a.actorType]}>{a.actorType}</Badge>
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 min-w-[12rem]">
                        <p className="text-slate-800">{AUDIT_LABELS[a.action] ?? a.action}</p>
                        <p className="text-xs">
                          <Entity row={a} />
                        </p>
                      </td>
                      <td className="py-3 pr-5 text-xs text-slate-500 min-w-[12rem] break-words">{detailText(a.details) || '—'}</td>
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
