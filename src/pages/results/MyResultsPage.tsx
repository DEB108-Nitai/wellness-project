import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, BarChart3, Loader2, PlayCircle, Plus } from 'lucide-react';
import { ApiError } from '../../api/client';
import { HistoryEntry, resultsApi } from '../../api/assessment';

/** /my-results — every assessment the user has completed or started (RES-3). */
export const MyResultsPage: React.FC = () => {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    resultsApi
      .history()
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load your results.'));
  }, []);

  const date = (iso: string) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-teal-700">My results</p>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Your personality reports</h1>
        </div>
        <Link to="/test" className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold">
          <Plus className="w-4 h-4" /> New assessment
        </Link>
      </header>

      {error && <p className="text-rose-600">{error}</p>}
      {!entries && !error && (
        <div className="py-20 flex justify-center" role="status">
          <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />
        </div>
      )}

      {entries && entries.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-4">
          <BarChart3 className="w-10 h-10 mx-auto text-teal-600" />
          <h2 className="text-xl font-bold text-slate-900 font-heading">No reports yet</h2>
          <p className="text-slate-600">Take the assessment to discover your 16 personality factors. It takes about 20 minutes.</p>
          <Link to="/test" className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold">
            Start the assessment <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <ul className="space-y-4">
        {entries?.map((e) => {
          const pct = Math.round((e.answeredCount / Math.max(1, e.totalItems)) * 100);
          return (
            <li key={e.ref} className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      e.status === 'completed' ? 'bg-teal-50 text-teal-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {e.status === 'completed' ? 'Completed' : `In progress · ${pct}%`}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{e.ref}</span>
                  {e.flagged && (
                    <span className="text-[11px] text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> lower reliability
                    </span>
                  )}
                </div>
                <p className="font-semibold text-slate-900">
                  {e.status === 'completed' && e.completedAt ? `Completed ${date(e.completedAt)}` : `Started ${date(e.startedAt)}`}
                </p>
                {e.topTraits.length > 0 && (
                  <p className="text-sm text-slate-500 truncate">
                    Stand-out traits: {e.topTraits.map((t) => `${t.name} (${t.sten})`).join(' · ')}
                  </p>
                )}
              </div>
              {e.status === 'completed' ? (
                <Link to={`/results/${e.ref}`} className="shrink-0 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-800">
                  View report <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link to="/test" className="shrink-0 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-sm font-semibold text-white">
                  <PlayCircle className="w-4 h-4" /> Continue
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
