import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { googleStartUrl, safeNext } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { AuthShell } from '../../components/auth/AuthShell';
import { FormAlert, GoogleButton, OrDivider, PageSpinner, PasswordField, SubmitButton, TextField } from '../../components/auth/FormControls';

const GOOGLE_ERRORS: Record<string, string> = {
  google_unavailable: 'Google sign-in is not available right now. Please use your email and password.',
  google_cancelled: 'Google sign-in was cancelled.',
  google_state: 'Your Google sign-in took too long. Please try again.',
  google_failed: 'We could not complete Google sign-in. Please try again.',
  signup_closed: 'New sign-ups are temporarily closed.',
  account_disabled: 'This account has been disabled. Please contact support.',
  rate_limited: 'Too many attempts. Please wait a few minutes and try again.',
};

export const LoginPage: React.FC = () => {
  const { user, loading, login, googleEnabled } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(GOOGLE_ERRORS[params.get('error') ?? ''] ?? null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <PageSpinner />;
  if (user) return <Navigate to={next} replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fields);
        setError(Object.keys(err.fields).length ? null : err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  const signupLink = `/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <AuthShell
      title="Welcome back"
      subtitle={
        <>
          New here?{' '}
          <Link to={signupLink} className="font-semibold text-teal-700 hover:text-teal-800">
            Create a free account
          </Link>
        </>
      }
    >
      {params.get('reset') === '1' && (
        <div className="mb-5">
          <FormAlert tone="success">Your password has been updated. Sign in with your new password.</FormAlert>
        </div>
      )}

      {googleEnabled && (
        <>
          <GoogleButton href={googleStartUrl(next)} label="Continue with Google" />
          <OrDivider />
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <FormAlert tone="error">{error}</FormAlert>}
        <TextField
          label="Email address"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          placeholder="you@example.com"
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          labelAction={
            <Link to="/forgot-password" className="text-sm font-medium text-teal-700 hover:text-teal-800">
              Forgot password?
            </Link>
          }
        />
        <SubmitButton loading={submitting}>Sign in</SubmitButton>
      </form>

      {googleEnabled && (
        <p className="mt-6 text-center text-[13px] text-slate-500">
          Created your account with Google? Use <span className="font-medium text-slate-700">Continue with Google</span> above.
        </p>
      )}
    </AuthShell>
  );
};
