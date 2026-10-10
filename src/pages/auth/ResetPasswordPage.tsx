import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { authApi } from '../../api/auth';
import { AuthShell } from '../../components/auth/AuthShell';
import { FormAlert, PasswordField, SubmitButton } from '../../components/auth/FormControls';

export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return (
      <AuthShell title="Link not valid">
        <FormAlert tone="error">This password reset link is incomplete or invalid.</FormAlert>
        <Link to="/forgot-password" className="mt-6 inline-block text-sm font-semibold text-teal-700 hover:text-teal-800">
          Request a new link →
        </Link>
      </AuthShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (password !== confirm) {
      setFieldErrors({ confirm: 'The two passwords do not match.' });
      return;
    }
    setSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      navigate('/login?reset=1', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setFieldErrors(err.fields);
      else setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Choose a new password" subtitle="You'll be signed out on all other devices once it's changed.">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {error && (
          <FormAlert tone="error">
            {error}{' '}
            <Link to="/forgot-password" className="font-semibold underline">
              Request a new link
            </Link>
          </FormAlert>
        )}
        <PasswordField
          label="New password"
          autoComplete="new-password"
          required
          showStrength
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          maxLength={128}
        />
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={fieldErrors.confirm}
          maxLength={128}
        />
        <SubmitButton loading={submitting}>Update password</SubmitButton>
      </form>
    </AuthShell>
  );
};
