import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailX } from 'lucide-react';
import { ApiError } from '../api/client';
import { siteApi } from '../api/site';

/** /unsubscribe?token=… — confirmed with a click so link-scanning email clients can't unsubscribe people by accident. */
export const UnsubscribePage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const valid = /^[a-f0-9]{32}$/.test(token);

  const confirm = async () => {
    setState('working');
    try {
      setMessage((await siteApi.unsubscribe(token)).message);
      setState('done');
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setState('error');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
      {state === 'done' ? (
        <>
          <CheckCircle2 className="w-12 h-12 mx-auto text-teal-600" />
          <h1 className="text-2xl font-bold text-slate-900 font-heading">{message}</h1>
          <p className="text-slate-600">You won't receive our newsletter any more. You can subscribe again at any time from the footer.</p>
          <Link to="/" className="inline-block text-sm font-semibold text-teal-700 hover:text-teal-800">
            ← Back to home
          </Link>
        </>
      ) : (
        <>
          <MailX className="w-12 h-12 mx-auto text-slate-400" />
          <h1 className="text-2xl font-bold text-slate-900 font-heading">Unsubscribe from our newsletter?</h1>
          {!valid ? (
            <p className="text-rose-600">This unsubscribe link is incomplete or invalid.</p>
          ) : (
            <>
              <p className="text-slate-600">You'll stop receiving updates about upcoming cohorts and new insights.</p>
              <button
                onClick={confirm}
                disabled={state === 'working'}
                className="inline-flex h-11 items-center gap-2 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold disabled:opacity-60 cursor-pointer"
              >
                {state === 'working' && <Loader2 className="w-4 h-4 animate-spin" />} Yes, unsubscribe me
              </button>
              {state === 'error' && <p className="text-sm text-rose-600">{message}</p>}
            </>
          )}
        </>
      )}
    </div>
  );
};
