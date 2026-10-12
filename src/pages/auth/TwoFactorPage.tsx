import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthenticatorSetup, authApi, safeNext, SessionPayload } from '../../api/auth';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { AuthShell } from '../../components/auth/AuthShell';
import { FormAlert, PageSpinner, SubmitButton } from '../../components/auth/FormControls';
import { AuthenticatorQr, CodeField, RecoveryCodesList } from '../../components/auth/TwoFactorParts';

/**
 * Admin two-step sign-in (ADM-12), after the password or Google was accepted. The first time it sets up an
 * authenticator app and shows the recovery codes; afterwards it asks for the code. Until it passes, the
 * server treats the browser as signed out.
 */

/** Shown after the server already signed the admin in, before the app picks that session up. */
type Held = { kind: 'codes'; codes: string[]; payload: SessionPayload } | { kind: 'recovery'; left: number; payload: SessionPayload };

export default function TwoFactorPage() {
  const { user, loading, twoFactor, applySession, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const destination = next === '/' ? '/admin' : next;

  const [setup, setSetup] = useState<AuthenticatorSetup | null>(null);
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [held, setHeld] = useState<Held | null>(null);
  const [saved, setSaved] = useState(false);

  const step = twoFactor?.step;

  // First sign-in: fetch the secret for the QR code (the same one until the setup is finished).
  useEffect(() => {
    if (step !== 'setup' || setup) return;
    let alive = true;
    authApi
      .twoFactorSetup()
      .then((s) => alive && setSetup(s))
      .catch((err) => alive && handleError(err));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  if (loading) return <PageSpinner />;
  if (held === null) {
    if (user) return <Navigate to={destination} replace />;
    if (!twoFactor) return <Navigate to={`/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} replace />;
  }

  function handleError(err: unknown) {
    if (err instanceof ApiError && err.code === 'TWO_FACTOR_EXPIRED') {
      navigate('/login?error=two_factor_expired', { replace: true });
      void logout();
      return;
    }
    if (err instanceof ApiError) {
      setFieldError(err.fields.code);
      setError(err.fields.code ? null : err.message);
    } else {
      setError('Something went wrong. Please try again.');
    }
  }

  const finish = (payload: SessionPayload) => {
    applySession(payload);
    navigate(destination, { replace: true });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(undefined);
    if (code.replace(/[\s-]/g, '') === '') {
      setFieldError(useRecovery ? 'Enter one of your recovery codes.' : 'Enter the 6-digit code from your app.');
      return;
    }
    setSubmitting(true);
    try {
      if (step === 'setup') {
        const { recoveryCodes, ...payload } = await authApi.twoFactorEnable(code);
        setHeld({ kind: 'codes', codes: recoveryCodes, payload });
      } else {
        const { recoveryCodesLeft, ...payload } = await authApi.twoFactorVerify(code);
        if (recoveryCodesLeft !== undefined) setHeld({ kind: 'recovery', left: recoveryCodesLeft, payload });
        else finish(payload);
      }
    } catch (err) {
      handleError(err);
      setCode('');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = (
    <p className="mt-6 text-center text-sm text-slate-500">
      Not you, or want to stop?{' '}
      <button
        type="button"
        onClick={async () => {
          await logout();
          navigate('/login', { replace: true });
        }}
        className="font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
      >
        Cancel and sign out
      </button>
    </p>
  );

  // ---------------------------------------------------------------- after the code passed
  if (held?.kind === 'codes') {
    return (
      <AuthShell
        title="Save your recovery codes"
        subtitle="If you lose your phone, each of these codes signs you in once. Keep them somewhere safe, such as a password manager. This is the only time they are shown."
      >
        <div className="space-y-6">
          <RecoveryCodesList codes={held.codes} saved={saved} onSavedChange={setSaved} />
          <button
            type="button"
            disabled={!saved}
            onClick={() => finish(held.payload)}
            className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[15px] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </AuthShell>
    );
  }
  if (held?.kind === 'recovery') {
    return (
      <AuthShell title="Signed in with a recovery code" subtitle="That code is now used up and will not work again.">
        <div className="space-y-6">
          <FormAlert tone={held.left <= 3 ? 'error' : 'info'}>
            You have {held.left} recovery {held.left === 1 ? 'code' : 'codes'} left. If you lost your phone, set up the new one on the Security page of the admin
            console, and create new recovery codes there.
          </FormAlert>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => {
                applySession(held.payload);
                navigate('/admin/security', { replace: true });
              }}
              className="flex-1 h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[15px] cursor-pointer"
            >
              Go to Security
            </button>
            <button type="button" onClick={() => finish(held.payload)} className="flex-1 h-12 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-[15px] cursor-pointer">
              Continue
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  // ---------------------------------------------------------------- first sign-in: set up the app
  if (step === 'setup') {
    return (
      <AuthShell
        title="Set up two-step sign-in"
        subtitle={`Hi ${twoFactor?.name ?? ''}. Admin accounts need a code from an authenticator app each time they sign in. This takes about a minute.`}
      >
        <form onSubmit={submit} className="space-y-6" noValidate>
          {error && <FormAlert tone="error">{error}</FormAlert>}
          <ol className="space-y-6 text-sm text-slate-700">
            <li className="space-y-1">
              <p className="font-semibold text-slate-900">1. Install an authenticator app on your phone</p>
              <p className="text-slate-600">For example Google Authenticator or Microsoft Authenticator. If you already use one, open it.</p>
            </li>
            <li className="space-y-3">
              <p className="font-semibold text-slate-900">2. In the app, add an account and scan this QR code</p>
              {setup ? <AuthenticatorQr secret={setup.secret} uri={setup.uri} /> : <p className="text-slate-400">Preparing…</p>}
            </li>
            <li className="space-y-3">
              <p className="font-semibold text-slate-900">3. Enter the 6-digit code the app shows</p>
              <CodeField value={code} onChange={setCode} error={fieldError} />
            </li>
          </ol>
          <SubmitButton loading={submitting} disabled={!setup}>
            Turn on two-step sign-in
          </SubmitButton>
        </form>
        {cancel}
      </AuthShell>
    );
  }

  // ---------------------------------------------------------------- every later sign-in
  return (
    <AuthShell
      title="Enter your sign-in code"
      subtitle={
        useRecovery
          ? 'Enter one of the recovery codes you saved when you set up two-step sign-in. Each code works once.'
          : `Open your authenticator app and enter the 6-digit code for ${settings.site_name}.`
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        {error && <FormAlert tone="error">{error}</FormAlert>}
        <CodeField key={useRecovery ? 'r' : 'c'} value={code} onChange={setCode} recovery={useRecovery} error={fieldError} autoFocus />
        <SubmitButton loading={submitting}>Sign in</SubmitButton>
      </form>
      <p className="mt-5 text-center text-sm">
        <button
          type="button"
          onClick={() => {
            setUseRecovery((v) => !v);
            setCode('');
            setFieldError(undefined);
            setError(null);
          }}
          className="font-semibold text-teal-700 hover:text-teal-800 cursor-pointer"
        >
          {useRecovery ? 'Use a code from the app instead' : 'Lost your phone? Use a recovery code'}
        </button>
      </p>
      {cancel}
      <p className="mt-4 text-center text-xs text-slate-400">
        Lost your phone and your recovery codes? Ask the person who runs the website’s server to reset two-step sign-in for you.
      </p>
    </AuthShell>
  );
}
