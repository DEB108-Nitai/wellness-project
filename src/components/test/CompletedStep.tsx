import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, CheckCircle2, Copy, Star } from 'lucide-react';
import { assessmentApi } from '../../api/assessment';
import { ApiError } from '../../api/client';
import { ResultsGate } from '../results/ResultsGate';

/** TEST-9 / TEST-11: confirmation, experience rating, and the way to the report. */
export const CompletedStep: React.FC<{ reference: string; resultsLocked: boolean }> = ({ reference, resultsLocked }) => {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewState, setReviewState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [reviewError, setReviewError] = useState('');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the code is visible on screen
    }
  };

  const sendReview = async () => {
    if (!rating) return;
    setReviewState('sending');
    try {
      await assessmentApi.review(reference, rating, comment.trim() || undefined);
      setReviewState('done');
    } catch (err) {
      setReviewError(err instanceof ApiError ? err.message : 'Could not send your rating.');
      setReviewState(err instanceof ApiError && err.code === 'ALREADY_REVIEWED' ? 'done' : 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">Assessment complete!</h1>
          <p className="text-sm text-slate-600">Your answers have been scored against the responses of more than 35,000 people.</p>
        </div>

        <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reference</span>
          <span className="font-mono font-bold text-slate-900 tracking-wider">{reference}</span>
          <button onClick={copy} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer" aria-label="Copy reference code">
            {copied ? <Check className="w-4 h-4 text-teal-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Experience rating */}
        <div className="max-w-md mx-auto pt-4 border-t border-slate-100 space-y-3">
          <p className="text-sm font-semibold text-slate-800">How was your experience?</p>
          {reviewState === 'done' ? (
            <p className="text-sm text-teal-700">Thank you for your feedback!</p>
          ) : (
            <>
              <div className="flex justify-center gap-1.5" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={rating === s}
                    aria-label={`${s} star${s > 1 ? 's' : ''}`}
                    onClick={() => setRating(s)}
                    className="p-1 cursor-pointer"
                  >
                    <Star className={`w-7 h-7 ${s <= rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>
              {rating > 0 && (
                <div className="flex gap-2">
                  <input
                    value={comment}
                    maxLength={1000}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Anything we could do better? (optional)"
                    className="flex-1 h-10 px-3 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:border-teal-500"
                  />
                  <button
                    onClick={sendReview}
                    disabled={reviewState === 'sending'}
                    className="px-4 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold disabled:opacity-60 cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              )}
              {reviewState === 'error' && <p className="text-xs text-rose-600">{reviewError}</p>}
            </>
          )}
        </div>

        {!resultsLocked && (
          <Link
            to={`/results/${reference}`}
            className="inline-flex h-12 items-center gap-2 px-8 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold shadow-md"
          >
            View my results <ArrowRight className="w-5 h-5" />
          </Link>
        )}
      </div>

      {resultsLocked && <ResultsGate reference={reference} />}
    </div>
  );
};
