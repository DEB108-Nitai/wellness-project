import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Clock } from 'lucide-react';

interface Props {
  totalItems: number;
  onAccept: () => void;
}

/** TEST-1: informed consent. Policy links open in a new tab so ticked boxes are never lost. */
export const ConsentStep: React.FC<Props> = ({ totalItems, onAccept }) => {
  const [terms, setTerms] = useState(false);
  const [notDiagnosis, setNotDiagnosis] = useState(false);
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!terms || !notDiagnosis) {
      setError('Please accept both statements to continue.');
      return;
    }
    onAccept();
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
      <div className="text-center space-y-3">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Step 1 of 2 · Before you begin</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">16 Personality Factors Assessment</h1>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">A few things to know before you start.</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-sm text-slate-700 leading-relaxed">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <Clock className="w-4 h-4 text-teal-600" />
          <span>What to expect</span>
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
          <li>
            <strong>About 20–25 minutes</strong> for {totalItems} short statements.
          </li>
          <li>
            <strong>No right or wrong answers.</strong> Describe yourself as you generally are, not as you wish to be.
          </li>
          <li>
            <strong>Saved as you go.</strong> Take a break any time and continue later — on any device once you're signed in.
          </li>
          <li>
            <strong>Your results:</strong> create a free account at the end to see your personal report.
          </li>
        </ul>
      </div>

      <form onSubmit={submit} className="space-y-6">
        <div className="space-y-4">
          <label className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-200 hover:border-teal-500/50 bg-white transition-all cursor-pointer">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-teal-600 cursor-pointer"
            />
            <span className="text-sm text-slate-700">
              I agree to the{' '}
              <Link to="/terms" target="_blank" className="text-teal-700 font-medium underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" target="_blank" className="text-teal-700 font-medium underline">
                Privacy Policy
              </Link>
              , and I understand that my responses are stored securely and kept in anonymised form for research.
            </span>
          </label>

          <label className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-200 hover:border-teal-500/50 bg-white transition-all cursor-pointer">
            <input
              type="checkbox"
              checked={notDiagnosis}
              onChange={(e) => setNotDiagnosis(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-teal-600 cursor-pointer"
            />
            <span className="text-sm text-slate-700">
              I understand this assessment is for self-understanding and personal growth, and is <strong>not</strong> a medical or
              clinical psychological diagnosis.
            </span>
          </label>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Link to="/" className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
            Back to Home
          </Link>
          <button
            type="submit"
            disabled={!terms || !notDiagnosis}
            className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
