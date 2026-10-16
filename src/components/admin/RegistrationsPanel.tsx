import React, { useEffect, useState } from 'react';
import { Download, Eye, Loader2, X } from 'lucide-react';
import { ApiError } from '../../api/client';
import { ProgramCode } from '../../api/challenge';
import { AdminRegistration, adminApi, REGISTRATION_STATUSES, RegistrationFilters, RegistrationPage, RegistrationStatus } from '../../api/admin';
import { Pager } from './ui';

export const PROGRAM_BADGE: Record<ProgramCode, string> = {
  STI: 'bg-teal-50 text-teal-800 border-teal-200',
  PTI: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  TTI: 'bg-amber-50 text-amber-800 border-amber-200',
};

export const STATUS_BADGE: Record<RegistrationStatus, string> = {
  registered: 'bg-sky-50 text-sky-800 border-sky-200',
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  waitlisted: 'bg-slate-100 text-slate-700 border-slate-300',
  completed: 'bg-purple-100 text-purple-800 border-purple-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/**
 * The registrations table for the filters chosen on the page (PRD ADM-4). The page owns the filters, so the
 * charts above, this table and the CSV export always show the same slice.
 */
export const RegistrationsTable: React.FC<{ filters: RegistrationFilters; onChanged?: () => void }> = ({ filters, onChanged }) => {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RegistrationPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminRegistration | null>(null);
  const key = JSON.stringify(filters);

  useEffect(() => setPage(1), [key]);

  // Only the latest request may update the table (a quick filter change must not show an older page).
  useEffect(() => {
    let alive = true;
    setError(null);
    adminApi
      .registrations({ ...filters, page, perPage: 25 })
      .then((d) => alive && setData(d))
      .catch((err) => alive && setError(err instanceof ApiError ? err.message : 'Could not load registrations.'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page]);

  const onUpdated = (updated: AdminRegistration) => {
    setSelected(updated);
    setData((d) => (d ? { ...d, items: d.items.map((r) => (r.id === updated.id ? updated : r)) } : d));
    onChanged?.(); // the tiles and charts above count statuses too
  };


  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-xs" aria-label="Registrations">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-900">
          Registrations {data && <span className="font-medium text-slate-400">({data.total})</span>}
        </h2>
        <a
          href={adminApi.registrationsCsvUrl(filters)}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" /> Export CSV
        </a>
      </div>

      {error && <p className="px-5 pt-4 text-sm text-rose-600">{error}</p>}

      <div className={`overflow-x-auto transition-opacity ${data && !error ? '' : 'opacity-70'}`}>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Reference</th>
              <th className="py-3 px-4">Participant</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Program</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Registered</th>
              <th className="py-3 px-4">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!data && (
              <tr>
                <td colSpan={7} className="py-10 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-teal-600 mx-auto" aria-label="Loading" />
                </td>
              </tr>
            )}
            {data?.items.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/60">
                <td className="py-3 px-4 font-mono font-bold text-slate-800">{r.ref}</td>
                <td className="py-3 px-4">
                  <div className="font-semibold text-slate-900">{r.name}</div>
                  <div className="text-[11px] text-slate-500">{[r.age ? `${r.age}y` : null, r.city].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-slate-800">{r.email}</div>
                  <div className="text-[11px] font-mono text-slate-500">{r.phone}</div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${PROGRAM_BADGE[r.program]}`}>{r.program}</span>
                  <div className="text-[11px] text-slate-500 mt-1 capitalize">{r.cohortTiming}</div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                </td>
                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{fmtDate(r.createdAt)}</td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => setSelected(r)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Open
                  </button>
                </td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  No registrations match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && <Pager page={data.page} perPage={data.perPage} total={data.total} onPage={setPage} />}

      {selected && <RegistrationDetail registration={selected} onClose={() => setSelected(null)} onUpdated={onUpdated} />}
    </section>
  );
};

const RegistrationDetail: React.FC<{ registration: AdminRegistration; onClose: () => void; onUpdated: (r: AdminRegistration) => void }> = ({
  registration: r,
  onClose,
  onUpdated,
}) => {
  const [status, setStatus] = useState<RegistrationStatus>(r.status);
  const [notes, setNotes] = useState(r.adminNotes ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      onUpdated(await adminApi.updateRegistration(r.id, { status, adminNotes: notes.trim() || null }));
      setMessage('Saved.');
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-mono font-bold text-slate-500">{r.ref}</span>
            <h3 className="text-xl font-bold text-slate-900 font-heading">{r.name}</h3>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${PROGRAM_BADGE[r.program]}`}>{r.programName}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer" aria-label="Close">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-xs">
          {[
            ['Email', r.email],
            ['Phone', r.phone],
            ['Age', r.age ?? '—'],
            ['City', r.city ?? '—'],
            ['Schedule', r.cohortTiming],
            ['Registered', fmtDate(r.createdAt)],
            ['Account', r.userId ? `User #${r.userId}` : 'Guest'],
          ].map(([k, v]) => (
            <div key={String(k)} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <dt className="text-slate-400">{k}</dt>
              <dd className="font-semibold text-slate-800 break-all">{v}</dd>
            </div>
          ))}
        </dl>

        {r.struggles.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-500">Struggles</p>
            <div className="flex flex-wrap gap-1.5">
              {r.struggles.map((s) => (
                <span key={s} className="text-[11px] bg-rose-50 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
        {r.primaryGoal && (
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500">Primary goal</p>
            <p className="text-sm text-slate-700 italic">“{r.primaryGoal}”</p>
          </div>
        )}

        <div className="space-y-3 pt-3 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-600">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as RegistrationStatus)} className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-xl capitalize">
              {REGISTRATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            Admin notes
            <textarea value={notes} maxLength={2000} rows={3} onChange={(e) => setNotes(e.target.value)} className="mt-1 w-full px-3 py-2 text-sm border border-slate-300 rounded-xl" />
          </label>
          <div className="flex items-center justify-end gap-3">
            {message && <span className="text-xs text-slate-500">{message}</span>}
            <button onClick={save} disabled={saving} className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl disabled:opacity-60 cursor-pointer">
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
