import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { ApiError } from '../../api/client';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { AuthShell } from '../../components/auth/AuthShell';

type State = { status: 'verifying' } | { status: 'done' } | { status: 'failed'; message: string };

export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { user, applySession } = useAuth();
  const [state, setState] = useState<State>({ status: 'verifying' });
  const [resent, setResent] = useState<string | null>(null);
  const started = useRef(false); // tokens are single-use: never submit twice (React StrictMode re-runs effects)

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    authApi
      .verifyEmail(token)
      .then((payload) => {
        applySession(payload);
        setState({ status: 'done' });
      })
      .catch((err) =>
        setState({ status: 'failed', message: err instanceof ApiError ? err.message : 'We could not verify your email. Please try again.' }),
      );
  }, [token, applySession]);

  const resend = async () => {
    try {
      setResent((await authApi.resendVerification()).message);
    } catch (err) {
      setResent(err instanceof ApiError ? err.message : 'Could not send a new link. Please try again later.');
    }
  };

  return (
    <AuthShell title="Email verification">
      {state.status === 'verifying' && (
        <p className="flex items-center gap-3 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin text-teal-600" /> Confirming your email address…
        </p>
      )}
      {state.status === 'done' && (
        <div className="space-y-6">
          <p className="flex items-start gap-3 text-[15px] text-slate-700">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" /> Your email address is confirmed. Thank you!
          </p>
          <Link
            to={user ? '/' : '/login'}
            className="inline-flex h-12 items-center px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold"
          >
            {user ? 'Continue' : 'Sign in'}
          </Link>
        </div>
      )}
      {state.status === 'failed' && (
        <div className="space-y-5">
          <p className="flex items-start gap-3 text-[15px] text-slate-700">
            <XCircle className="w-6 h-6 text-rose-500 shrink-0" /> {state.message}
          </p>
          {user && !user.emailVerified ? (
            resent ? (
              <p className="text-sm text-slate-600">{resent}</p>
            ) : (
              <button onClick={resend} className="text-sm font-semibold text-teal-700 hover:text-teal-800 cursor-pointer">
                Send me a new verification link
              </button>
            )
          ) : (
            <Link to={user ? '/account' : '/login'} className="text-sm font-semibold text-teal-700 hover:text-teal-800">
              {user ? 'Go to my account' : 'Sign in to request a new link'} →
            </Link>
          )}
        </div>
      )}
    </AuthShell>
  );
};
