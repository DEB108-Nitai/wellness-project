import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, LogIn, XCircle } from 'lucide-react';
import { ApiError } from '../../api/client';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { AuthShell } from '../../components/auth/AuthShell';

/** 'signin' / 'wrong': the link is only accepted by the account it was sent for (a refused click keeps it valid). */
type State =
  | { status: 'verifying' }
  | { status: 'done' }
  | { status: 'signin' }
  | { status: 'wrong'; message: string }
  | { status: 'failed'; message: string };

export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { user, applySession, logout } = useAuth();
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
      .catch((err) => {
        if (err instanceof ApiError && err.code === 'SIGN_IN_TO_VERIFY') setState({ status: 'signin' });
        else if (err instanceof ApiError && err.code === 'WRONG_ACCOUNT') setState({ status: 'wrong', message: err.message });
        else setState({ status: 'failed', message: err instanceof ApiError ? err.message : 'We could not verify your email. Please try again.' });
      });
  }, [token, applySession]);

  // After signing in, the login page brings the person straight back here to finish.
  const signInHref = `/login?next=${encodeURIComponent(`/verify-email?token=${token}`)}`;

  const resend = async () => {
    try {
      setResent((await authApi.resendVerification()).message);
    } catch (err) {
      setResent(err instanceof ApiError ? err.message : 'Could not send a new link. Please try again later.');
    }
  };

  return (
    <AuthShell title="Verify your email">
      {state.status === 'verifying' && (
        <p className="flex items-center gap-3 text-slate-600">
          <Loader2 className="w-5 h-5 animate-spin text-teal-600" /> Confirming your email address…
        </p>
      )}
      {state.status === 'done' && (
        <div className="space-y-6">
          <p className="flex items-start gap-3 text-[15px] text-slate-700">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            {/* Verifying never signs anyone in: a forwarded link must not open the account. */}
            {user ? 'Your email address is confirmed. Thank you!' : 'Your email is confirmed. Sign in to continue.'}
          </p>
          <Link
            to={user ? '/' : '/login'}
            className="inline-flex h-12 items-center px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold"
          >
            {user ? 'Continue' : 'Sign in'}
          </Link>
        </div>
      )}
      {(state.status === 'signin' || state.status === 'wrong') && (
        <div className="space-y-6">
          <p className="flex items-start gap-3 text-[15px] text-slate-700">
            <LogIn className="w-6 h-6 text-teal-600 shrink-0" />
            {state.status === 'wrong'
              ? state.message
              : 'Please sign in to the account you created to confirm your email address. Your link will still work.'}
          </p>
          {state.status === 'wrong' ? (
            <button
              onClick={async () => {
                await logout();
                setState({ status: 'signin' });
              }}
              className="inline-flex h-12 items-center px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold cursor-pointer"
            >
              Sign out
            </button>
          ) : (
            <Link
              to={signInHref}
              className="inline-flex h-12 items-center px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold"
            >
              Sign in
            </Link>
          )}
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
