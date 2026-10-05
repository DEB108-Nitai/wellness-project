import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2, PlayCircle, RotateCcw } from 'lucide-react';
import { ApiError } from '../../api/client';
import { assessmentApi, Demographics, ItemsPayload, SessionState } from '../../api/assessment';
import { useAuth } from '../../context/AuthContext';
import { useActiveSession } from '../../context/ActiveSessionContext';
import { useAutosave } from '../../hooks/useAutosave';
import { ConsentStep } from '../../components/test/ConsentStep';
import { DemographicsStep } from '../../components/test/DemographicsStep';
import { QuestionsStep } from '../../components/test/QuestionsStep';
import { ReviewStep } from '../../components/test/ReviewStep';
import { CompletedStep } from '../../components/test/CompletedStep';

type Step = 'loading' | 'failed' | 'consent' | 'demographics' | 'questions' | 'review' | 'completed';

const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

/**
 * The assessment (PRD §4.2): consent → demographics → statements → review → completed.
 * All state lives on the server; this page only renders and autosaves.
 */
export const AssessmentPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const activeSession = useActiveSession();

  const [step, setStep] = useState<Step>('loading');
  const [loadError, setLoadError] = useState('');
  const [itemSet, setItemSet] = useState<ItemsPayload | null>(null);
  const [draft, setDraft] = useState<SessionState | null>(null); // offered for resume
  const [session, setSession] = useState<SessionState | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [page, setPage] = useState(1);
  const [missingId, setMissingId] = useState<number | null>(null);

  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [startFieldErrors, setStartFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<{ ref: string; locked: boolean } | null>(null);

  const autosave = useAutosave(session?.ref ?? null, page);

  const perPage = itemSet?.itemsPerPage ?? 7;
  const pages = useMemo(() => {
    const items = itemSet?.items ?? [];
    const out = [];
    for (let i = 0; i < items.length; i += perPage) out.push(items.slice(i, i + perPage));
    return out;
  }, [itemSet, perPage]);
  const totalItems = itemSet?.items.length ?? 0;

  // ------------------------------------------------------------------ load
  const load = useCallback(async () => {
    setStep('loading');
    try {
      const [items, current] = await Promise.all([assessmentApi.items(), assessmentApi.current()]);
      setItemSet(items);
      setDraft(current);
      setStep('consent');
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'We could not load the assessment. Please try again.');
      setStep('failed');
    }
  }, []);

  // Wait for the auth check so a signed-in user's session (not a guest one) is found.
  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  // ------------------------------------------------------------------ resume / start
  const enterSession = (state: SessionState) => {
    setSession(state);
    const restored: Record<number, number> = {};
    Object.entries(state.answers).forEach(([id, v]) => (restored[Number(id)] = v));
    setAnswers(restored);
    // Resume at the first page that still has an unanswered statement; if none, go straight to review.
    const firstOpen = pages.findIndex((items) => items.some((q) => !restored[q.id]));
    if (firstOpen === -1 && pages.length > 0) {
      setPage(pages.length);
      setStep('review');
    } else {
      setPage(firstOpen + 1 || 1);
      setStep('questions');
    }
    scrollTop();
  };

  // After the session is set, merge answers that were saved offline in this browser and push them.
  useEffect(() => {
    if (!session) return;
    const offline = autosave.restore();
    if (Object.keys(offline).length) {
      setAnswers((a) => ({ ...a, ...Object.fromEntries(Object.entries(offline).map(([k, v]) => [Number(k), v])) }));
      void autosave.flush();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.ref]);

  const startOver = async () => {
    try {
      await activeSession.abandon();
    } catch {
      // nothing to abandon
    }
    setDraft(null);
  };

  const start = async (demographics: Demographics) => {
    setStarting(true);
    setStartError(null);
    setStartFieldErrors({});
    try {
      const state = await assessmentApi.start(demographics);
      void activeSession.refresh();
      enterSession(state);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SESSION_EXISTS') {
        const current = await assessmentApi.current();
        setDraft(current);
        setStep('consent');
      } else if (err instanceof ApiError && Object.keys(err.fields).length) {
        setStartFieldErrors(err.fields);
      } else {
        setStartError(err instanceof ApiError ? err.message : 'Could not start the assessment. Please try again.');
      }
    } finally {
      setStarting(false);
    }
  };

  // ------------------------------------------------------------------ answering
  const answer = useCallback(
    (itemId: number, value: number) => {
      setAnswers((a) => ({ ...a, [itemId]: value }));
      setMissingId(null);
      autosave.queue(itemId, value);
      // Gently move to the next unanswered statement on this page.
      window.setTimeout(() => {
        const next = pages[page - 1]?.find((q) => q.id !== itemId && !answers[q.id]);
        if (next) document.getElementById(`q-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    },
    [autosave, pages, page, answers],
  );

  const goToPage = (target: number) => {
    void autosave.flush(); // time spent so far belongs to the page we are leaving
    setPage(target);
    setStep('questions');
    scrollTop();
  };

  const next = useCallback(() => {
    const missing = pages[page - 1]?.find((q) => !answers[q.id]);
    if (missing) {
      setMissingId(missing.id);
      document.getElementById(`q-${missing.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    void autosave.flush();
    if (page < pages.length) {
      setPage(page + 1);
    } else {
      setStep('review');
    }
    scrollTop();
  }, [pages, page, answers, autosave]);

  const prev = () => {
    if (page > 1) goToPage(page - 1);
  };

  // ------------------------------------------------------------------ submit
  const submit = async () => {
    if (!session) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await autosave.flush();
      if (autosave.hasPending()) {
        throw new ApiError(0, 'NETWORK', 'Some answers are not saved yet. Please check your connection and try again.');
      }
      const result = await assessmentApi.submit(session.ref);
      setCompleted({ ref: result.ref, locked: result.resultsLocked });
      void activeSession.refresh();
      setStep('completed');
      scrollTop();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'INCOMPLETE') {
        const position = Number(err.fields.firstMissingPosition);
        setSubmitError(err.message);
        if (position) setPage(Math.ceil(position / perPage));
      } else {
        setSubmitError(err instanceof ApiError ? err.message : 'Could not submit. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ------------------------------------------------------------------ render
  if (step === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" role="status">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (step === 'failed') {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center space-y-4">
        <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />
        <p className="text-slate-700">{loadError}</p>
        <button onClick={load} className="px-5 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer">
          Try again
        </button>
      </div>
    );
  }

  if (step === 'questions') {
    return (
      <QuestionsStep
        items={pages[page - 1] ?? []}
        page={page}
        totalPages={pages.length}
        totalItems={totalItems}
        answers={answers}
        saveStatus={autosave.status}
        missingId={missingId}
        onAnswer={answer}
        onNext={next}
        onPrev={prev}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      {step === 'consent' && draft && (
        <ResumeCard draft={draft} perPage={perPage} onResume={() => enterSession(draft)} onStartOver={startOver} />
      )}
      {step === 'consent' && <ConsentStep totalItems={totalItems} onAccept={() => {
            setStep('demographics');
            scrollTop();
          }} />}
      {step === 'demographics' && (
        <DemographicsStep
          minAge={itemSet?.minAge ?? 18}
          defaultNickname={user?.name.split(' ')[0] ?? ''}
          submitting={starting}
          error={startError}
          fieldErrors={startFieldErrors}
          onBack={() => setStep('consent')}
          onSubmit={start}
        />
      )}
      {step === 'review' && (
        <ReviewStep pages={pages} answers={answers} totalItems={totalItems} submitting={submitting} error={submitError} onJump={goToPage} onSubmit={submit} />
      )}
      {step === 'completed' && completed && <CompletedStep reference={completed.ref} resultsLocked={completed.locked} />}
    </div>
  );
};

const ResumeCard: React.FC<{ draft: SessionState; perPage: number; onResume: () => void; onStartOver: () => void }> = ({
  draft,
  perPage,
  onResume,
  onStartOver,
}) => {
  const pct = Math.round((draft.answeredCount / draft.totalItems) * 100);
  return (
    <div className="bg-gradient-to-br from-teal-900 via-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white border-2 border-teal-500/40 shadow-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-400/30">
            <PlayCircle className="w-3.5 h-3.5" /> Assessment in progress
          </span>
          <h2 className="text-xl sm:text-2xl font-bold font-heading">Welcome back{draft.nickname ? `, ${draft.nickname}` : ''}!</h2>
          <p className="text-sm text-slate-300">
            You've answered <strong>{draft.answeredCount} of {draft.totalItems}</strong> statements.
          </p>
        </div>
        <div className="sm:text-right">
          <span className="text-3xl font-extrabold text-teal-400 font-mono">{pct}%</span>
          <p className="text-[11px] text-slate-400">
            Page {draft.currentPage} of {Math.ceil(draft.totalItems / perPage)}
          </p>
        </div>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden border border-slate-700">
        <div className="bg-gradient-to-r from-teal-400 to-emerald-400 h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={onResume}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlayCircle className="w-4 h-4" /> Resume where I left off
        </button>
        <button type="button" onClick={onStartOver} className="text-sm text-slate-400 hover:text-rose-300 flex items-center gap-1.5 cursor-pointer py-1">
          <RotateCcw className="w-3.5 h-3.5" /> Start over
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        Not you? <Link to="/login" className="underline">Sign in</Link> to your own account.
      </p>
    </div>
  );
};
