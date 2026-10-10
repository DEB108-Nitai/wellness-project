import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Eye, Loader2, Search, X } from 'lucide-react';
import { ApiError } from '../../api/client';
import { PROGRAMS, ProgramCode } from '../../api/challenge';
import { AdminRegistration, adminApi, REGISTRATION_STATUSES, RegistrationPage, RegistrationStatus } from '../../api/admin';

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

const fmtDate = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** 60-Day Challenge registrations for all three programs, on server data (PRD ADM-4). */
export const RegistrationsPanel: React.FC = () => {
  const [program, setProgram] = useState<ProgramCode | ''>('');
  const [status, setStatus] = useState<RegistrationStatus | ''>('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RegistrationPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminRegistration | null>(null);

  // Debounce the search box.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await adminApi.registrations({ program: program || undefined, status: status || undefined, q: q || undefined, page, perPage: 25 }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load registrations.');
    }
  }, [program, status, q, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const onUpdated = (updated: AdminRegistration) => {
    setSelected(updated);
    setData((d) => (d ? { ...d, items: d.items.map((r) => (r.id === updated.id ? updated : r)) } : d));
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;
  const filters = { program: program || undefined, status: status || undefined, q: q || undefined };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
            60-Day Challenge Registrations
          </h2>
          <p className="text-xs text-slate-500">Sonic (STI), Philosophical (PTI) and Transcendental (TTI) — newest first.</p>
        </div>
        <a
          href={adminApi.registrationsCsvUrl(filters)}
          className="self-start px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </a>
      </div>

      {/* Program summary chips */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(['STI', 'PTI', 'TTI'] as ProgramCode[]).map((code) => {
            const counts = data.counts[code] ?? {};
            const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);
            return (
              <button
                key={code}
                onClick={() => {
                  setProgram(program === code ? '' : code);
                  setPage(1);
                }}
                className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${program === code ? 'ring-2 ring-indigo-500' : ''} ${PROGRAM_BADGE[code]}`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider">{PROGRAMS[code].short}</span>
                <span className="block text-2xl font-bold font-mono">{total}</span>
                <span className="text-[11px]">{counts.registered ?? 0} new · {counts.confirmed ?? 0} confirmed</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, city or reference…"
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-500"
            aria-label="Search registrations"
          />
        </div>
        <select
          value={program}
          onChange={(e) => {
            setProgram(e.target.value as ProgramCode | '');
            setPage(1);
          }}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl"
          aria-label="Program"
        >
          <option value="">All programs</option>
          {(['STI', 'PTI', 'TTI'] as ProgramCode[]).map((c) => (
            <option key={c} value={c}>
              {PROGRAMS[c].short}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as RegistrationStatus | '');
            setPage(1);
          }}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl capitalize"
          aria-label="Status"
        >
          <option value="">All statuses</option>
          {REGISTRATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {/* Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="py-3 px-4">Reference</th>
              <th className="py-3 px-4">Participant</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Program</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Registered</th>
              <th className="py-3 px-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!data && (
              <tr>
                <td colSpan={7} className="py-10 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mx-auto" />
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
                    <Eye className="w-3.5 h-3.5" /> Open
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

      {data && data.total > data.perPage && (
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            {data.total} registrations · page {data.page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="p-2 rounded-lg border border-slate-300 disabled:opacity-40 cursor-pointer" aria-label="Previous page">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="p-2 rounded-lg border border-slate-300 disabled:opacity-40 cursor-pointer" aria-label="Next page">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {selected && <RegistrationDetail registration={selected} onClose={() => setSelected(null)} onUpdated={onUpdated} />}
    </div>
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
