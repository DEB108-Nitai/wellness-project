import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { googleStartUrl, safeNext } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import { AuthShell } from '../../components/auth/AuthShell';
import { FormAlert, GoogleButton, OrDivider, PageSpinner, PasswordField, SubmitButton, TextField } from '../../components/auth/FormControls';

export const SignupPage: React.FC = () => {
  const { user, loading, signup, googleEnabled } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<React.ReactNode>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <PageSpinner />;
  if (user) return <Navigate to={next} replace />;

  const loginLink = `/login${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (password.length < 8) {
      setFieldErrors({ password: 'Use at least 8 characters.' });
      return;
    }
    setSubmitting(true);
    try {
      await signup(name.trim(), email.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fields);
        if (err.code === 'EMAIL_TAKEN') {
          setError(
            <>
              An account with this email already exists.{' '}
              <Link to={loginLink} className="font-semibold underline">
                Sign in instead
              </Link>
              .
            </>,
          );
        } else if (!Object.keys(err.fields).length) {
          setError(err.message);
        }
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Create your free account"
      subtitle={
        <>
          Already have one?{' '}
          <Link to={loginLink} className="font-semibold text-teal-700 hover:text-teal-800">
            Sign in
          </Link>
        </>
      }
    >
      {googleEnabled && (
        <>
          <GoogleButton href={googleStartUrl(next)} label="Sign up with Google" />
          <OrDivider />
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && <FormAlert tone="error">{error}</FormAlert>}
        <TextField
          label="Full name"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          placeholder="e.g. Maya Lin"
          maxLength={100}
        />
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
          autoComplete="new-password"
          required
          showStrength
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          maxLength={128}
        />
        <SubmitButton loading={submitting}>Create account</SubmitButton>
        <p className="text-[13px] text-slate-500 leading-relaxed text-center">
          By creating an account you agree to our{' '}
          <Link to="/terms" target="_blank" className="underline hover:text-teal-700">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link to="/privacy" target="_blank" className="underline hover:text-teal-700">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </AuthShell>
  );
};
