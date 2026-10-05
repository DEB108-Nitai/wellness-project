import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles } from 'lucide-react';

/**
 * Shown to guests who finished the assessment (TEST-9): the report is ready but
 * only visible after creating a free account. Signing up in this browser
 * attaches the assessment to the new account automatically.
 */
export const ResultsGate: React.FC<{ reference: string }> = ({ reference }) => {
  const next = encodeURIComponent(`/results/${reference}`);
  return (
    <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[34rem]">
      {/* Blurred preview of a report */}
      <div aria-hidden="true" className="p-6 sm:p-10 space-y-4 blur-[6px] select-none pointer-events-none opacity-60">
        {['Warmth', 'Reasoning', 'Emotional Stability', 'Dominance', 'Liveliness', 'Rule-Consciousness'].map((name, i) => (
          <div key={name} className="space-y-1.5">
            <div className="flex justify-between text-sm font-semibold text-slate-700">
              <span>{name}</span>
              <span>Sten {[7, 5, 8, 4, 6, 3][i]}</span>
            </div>
            <div className="h-3 rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-teal-500" style={{ width: `${[70, 50, 80, 40, 60, 30][i]}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-4 bg-gradient-to-b from-white/30 via-white/80 to-white">
        <div className="max-w-md w-full text-center space-y-5 bg-white/95 rounded-3xl border border-slate-200 shadow-xl p-6 sm:p-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
            <Lock className="w-6 h-6 text-teal-700" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 font-heading">Your profile is ready</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Create a free account to unlock your full 16-factor report. It stays private to you and is saved to your history.
            </p>
          </div>
          <div className="space-y-2.5">
            <Link
              to={`/signup?next=${next}`}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              <Sparkles className="w-4 h-4" /> Create free account & see results
            </Link>
            <Link
              to={`/login?next=${next}`}
              className="flex h-12 items-center justify-center rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold"
            >
              I already have an account
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Reference code <span className="font-mono font-semibold text-slate-700">{reference}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
