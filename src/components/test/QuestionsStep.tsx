import React, { useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock, CloudOff, Loader2 } from 'lucide-react';
import { TestItem } from '../../api/assessment';
import { SaveStatus } from '../../hooks/useAutosave';

interface Props {
  items: TestItem[];
  page: number;
  totalPages: number;
  totalItems: number;
  answers: Record<number, number>;
  saveStatus: SaveStatus;
  elapsedSeconds: number;
  missingId: number | null;
  onAnswer: (itemId: number, value: number) => void;
  onNext: () => void;
  onPrev: () => void;
}

const OPTIONS = [
  { value: 1, label: 'Strongly disagree', size: 'w-12 h-12 sm:w-14 sm:h-14', idle: 'border-rose-400/80 hover:bg-rose-50', active: 'bg-rose-500 border-rose-500 ring-rose-200', check: 'w-5 h-5' },
  { value: 2, label: 'Disagree', size: 'w-10 h-10 sm:w-11 sm:h-11', idle: 'border-rose-300 hover:bg-rose-50', active: 'bg-rose-400 border-rose-400 ring-rose-100', check: 'w-4 h-4' },
  { value: 3, label: 'Neutral', size: 'w-8 h-8 sm:w-9 sm:h-9', idle: 'border-slate-300 hover:bg-slate-100', active: 'bg-slate-500 border-slate-500 ring-slate-200', check: 'w-3.5 h-3.5' },
  { value: 4, label: 'Agree', size: 'w-10 h-10 sm:w-11 sm:h-11', idle: 'border-teal-400 hover:bg-teal-50', active: 'bg-teal-500 border-teal-500 ring-teal-100', check: 'w-4 h-4' },
  { value: 5, label: 'Strongly agree', size: 'w-12 h-12 sm:w-14 sm:h-14', idle: 'border-teal-500/80 hover:bg-teal-50', active: 'bg-teal-600 border-teal-600 ring-teal-200', check: 'w-5 h-5' },
];

/** 75 → "1:15", 3725 → "1:02:05" */
function formatTime(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

const SaveIndicator: React.FC<{ status: SaveStatus }> = ({ status }) => {
  const map: Record<SaveStatus, React.ReactNode> = {
    idle: null,
    saving: (
      <span className="flex items-center gap-1 text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
      </span>
    ),
    saved: <span className="text-teal-700">Saved ✓</span>,
    offline: (
      <span className="flex items-center gap-1 text-amber-700">
        <CloudOff className="w-3.5 h-3.5" /> Offline — will retry
      </span>
    ),
    error: <span className="text-amber-700">Not saved yet — retrying</span>,
  };
  return (
    <span aria-live="polite" className="text-xs font-medium">
      {map[status]}
    </span>
  );
};

/** TEST-7: one page of statements on the 5-point circle scale. */
export const QuestionsStep: React.FC<Props> = ({ items, page, totalPages, totalItems, answers, saveStatus, elapsedSeconds, missingId, onAnswer, onNext, onPrev }) => {
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / totalItems) * 100);

  // Keyboard: 1–5 answers the first unanswered statement on the page, Enter goes to the next page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[1-5]$/.test(e.key)) {
        const next = items.find((q) => !answers[q.id]);
        if (next) onAnswer(next.id, Number(e.key));
      } else if (e.key === 'Enter') {
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, answers, onAnswer, onNext]);

  return (
    <div className="pb-24">
      {/* Sticky progress */}
      <div className="sticky top-18 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5 gap-3">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-900">
                Page {page} of {totalPages}
              </span>
              <span className="hidden sm:inline text-slate-400">·</span>
              <span className="hidden sm:inline">
                {answeredCount} of {totalItems} answered
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-teal-700 font-bold font-mono">{progress}%</span>
              <span className="flex items-center gap-1 text-slate-500 font-mono" title="Time spent" aria-label={`Time spent ${formatTime(elapsedSeconds)}`}>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formatTime(elapsedSeconds)}
              </span>
              <SaveIndicator status={saveStatus} />
            </div>
          </div>
          <div
            className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Assessment progress"
          >
            <div className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {saveStatus === 'offline' && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center gap-2">
            <CloudOff className="w-4 h-4 text-amber-600 shrink-0" />
            You're offline. Keep going — your answers are kept on this device and will be saved as soon as you're back online.
          </div>
        </div>
      )}

      {progress >= 50 && progress < 55 && (
        <div className="max-w-3xl mx-auto px-4 pt-4">
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-sm flex items-center gap-2">
            <span className="font-semibold">Halfway there! Keep going with your first natural instinct.</span>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 pt-8 space-y-8">
        {items.map((q) => {
          const current = answers[q.id];
          const missing = missingId === q.id;
          return (
            <fieldset
              key={q.id}
              id={`q-${q.id}`}
              className={`pt-6 pb-8 px-4 sm:px-8 rounded-3xl transition-all duration-200 text-center space-y-5 ${
                missing ? 'bg-rose-50/70 ring-2 ring-rose-400' : current ? 'bg-white shadow-xs border border-slate-200/90' : 'bg-white/60 border border-slate-200/50'
              }`}
            >
              <legend className="sr-only">Statement {q.position}</legend>
              <div className="space-y-1 max-w-2xl mx-auto">
                <span className="text-[11px] font-mono font-medium text-slate-400 block">
                  Statement {q.position} of {totalItems}
                </span>
                <p className="text-lg sm:text-xl font-semibold text-slate-900 leading-snug font-heading">{q.text}</p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center justify-center gap-2.5 sm:gap-6 py-2" role="radiogroup" aria-label={q.text}>
                  <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-rose-600 mr-1">Disagree</span>
                  {OPTIONS.map((o) => {
                    const selected = current === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={o.label}
                        title={o.label}
                        onClick={() => onAnswer(q.id, o.value)}
                        className={`${o.size} rounded-full border-2 transition-all flex items-center justify-center cursor-pointer focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/30 ${
                          selected ? `${o.active} text-white scale-110 shadow-md ring-4` : `${o.idle} text-transparent`
                        }`}
                      >
                        {selected && <Check className={`${o.check} stroke-[3]`} />}
                      </button>
                    );
                  })}
                  <span className="hidden sm:inline text-xs font-bold uppercase tracking-wider text-teal-700 ml-1">Agree</span>
                </div>
                <div className="sm:hidden w-full max-w-xs flex justify-between text-[11px] font-bold uppercase tracking-wider">
                  <span className="text-rose-600">Disagree</span>
                  <span className="text-teal-700">Agree</span>
                </div>
              </div>

              {missing && <p className="text-sm text-rose-600 font-medium">Please choose an answer to continue.</p>}
            </fieldset>
          );
        })}

        <div className="flex items-center justify-between pt-4">
          <button
            type="button"
            onClick={onPrev}
            disabled={page === 1}
            className="px-5 py-3 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <p className="hidden md:block text-xs text-slate-400">
            Tip: press <kbd className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">1</kbd>–
            <kbd className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">5</kbd> to answer,{' '}
            <kbd className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">Enter</kbd> for next
          </p>
          <button
            type="button"
            onClick={onNext}
            className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm flex items-center gap-2 cursor-pointer"
          >
            {page === totalPages ? 'Review answers' : 'Next page'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
