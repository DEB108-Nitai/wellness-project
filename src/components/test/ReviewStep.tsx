import React from 'react';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { TestItem } from '../../api/assessment';

interface Props {
  pages: TestItem[][];
  answers: Record<number, number>;
  totalItems: number;
  submitting: boolean;
  error: string | null;
  onJump: (page: number) => void;
  onSubmit: () => void;
}

/** Page map before submitting; every statement must be answered (TEST-7/8). */
export const ReviewStep: React.FC<Props> = ({ pages, answers, totalItems, submitting, error, onJump, onSubmit }) => {
  const answered = Object.keys(answers).length;
  const complete = answered >= totalItems;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Almost done</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">Ready to see your profile?</h1>
        <p className="text-sm text-slate-600">
          You have answered <span className="font-bold text-teal-700">{answered} of {totalItems}</span> statements.
          {!complete && ' Pages marked with ! still have unanswered statements.'}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pages — select one to review or change answers</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {pages.map((items, i) => {
            const done = items.every((q) => answers[q.id]);
            return (
              <button
                key={i}
                type="button"
                onClick={() => onJump(i + 1)}
                className={`py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                  done ? 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100' : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                {i + 1} {done ? '✓' : '!'}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <button type="button" onClick={() => onJump(pages.length)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
          Back to statements
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {complete ? 'Submit and calculate my profile' : 'Submit'} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
