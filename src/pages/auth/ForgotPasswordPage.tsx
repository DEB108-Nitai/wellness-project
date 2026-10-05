import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { ApiError } from '../../api/client';
import { authApi } from '../../api/auth';
import { AuthShell } from '../../components/auth/AuthShell';
import { FormAlert, SubmitButton, TextField } from '../../components/auth/FormControls';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldError(undefined);
    setSubmitting(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSentTo(email.trim());
    } catch (err) {
      if (err instanceof ApiError && err.fields.email) setFieldError(err.fields.email);
      else setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <AuthShell title="Check your inbox">
        <div className="space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
            <MailCheck className="w-7 h-7 text-teal-600" />
          </div>
          <p className="text-[15px] text-slate-600 leading-relaxed">
            If an account exists for <span className="font-semibold text-slate-900">{sentTo}</span>, we have sent a link to reset
            your password. The link expires in 60 minutes.
          </p>
          <p className="text-sm text-slate-500">Can't find it? Check your spam folder, or try again in a few minutes.</p>
          <Link to="/login" className="inline-block text-sm font-semibold text-teal-700 hover:text-teal-800">
            ← Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter the email you signed up with and we'll send you a link to choose a new one.">
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
          error={fieldError}
          placeholder="you@example.com"
        />
        <SubmitButton loading={submitting}>Send reset link</SubmitButton>
        <p className="text-center">
          <Link to="/login" className="text-sm font-semibold text-teal-700 hover:text-teal-800">
            ← Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
};
