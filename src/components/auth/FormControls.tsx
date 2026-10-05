import React, { useId, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';

const inputBase =
  'w-full h-12 px-4 text-[15px] rounded-xl border bg-white text-slate-900 placeholder:text-slate-400 transition-shadow focus:outline-hidden focus:ring-4';
const inputOk = 'border-slate-300 focus:border-teal-500 focus:ring-teal-500/15';
const inputError = 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15';

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  labelAction?: React.ReactNode;
}

export const TextField: React.FC<FieldProps> = ({ label, error, hint, labelAction, className, ...input }) => {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        {labelAction}
      </div>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${inputBase} ${error ? inputError : inputOk} ${className ?? ''}`}
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} className="text-[13px] text-rose-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

/** Rough client-side guide only; the server's PasswordPolicy is authoritative. */
function strength(password: string): { score: number; label: string } {
  if (password.length === 0) return { score: 0, label: '' };
  if (password.length < 8) return { score: 0, label: 'Too short' };
  const variety = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  let score = 1;
  if (password.length >= 12) score++;
  if (variety >= 3) score++;
  if (password.length >= 16) score++;
  return { score, label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score] };
}

export const PasswordField: React.FC<FieldProps & { showStrength?: boolean }> = ({
  showStrength,
  hint,
  error,
  value,
  ...rest
}) => {
  const [visible, setVisible] = useState(false);
  const { score, label } = strength(String(value ?? ''));
  const colors = ['bg-rose-400', 'bg-rose-400', 'bg-amber-400', 'bg-teal-500', 'bg-emerald-500'];

  return (
    <div className="space-y-2">
      <div className="relative">
        <TextField
          {...rest}
          value={value}
          error={error}
          hint={showStrength ? undefined : hint}
          type={visible ? 'text' : 'password'}
          className="pr-12 font-mono tracking-wide"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-[34px] p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
        </button>
      </div>
      {showStrength && !error && (
        <div className="space-y-1.5" aria-live="polite">
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${score >= i ? colors[score] : 'bg-slate-200'}`} />
            ))}
          </div>
          <p className="text-[13px] text-slate-500">
            {label ? <span className="font-medium text-slate-700">{label}. </span> : null}
            {hint ?? 'At least 8 characters. A short phrase of unrelated words works well.'}
          </p>
        </div>
      )}
    </div>
  );
};

export const SubmitButton: React.FC<{ loading: boolean; children: React.ReactNode; disabled?: boolean }> = ({
  loading,
  children,
  disabled,
}) => (
  <button
    type="submit"
    disabled={loading || disabled}
    className="w-full h-12 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-[15px] shadow-sm shadow-teal-700/20 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
  >
    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
    {children}
  </button>
);

export const FormAlert: React.FC<{ tone: 'error' | 'success' | 'info'; children: React.ReactNode }> = ({ tone, children }) => {
  const styles = {
    error: 'bg-rose-50 border-rose-200 text-rose-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info: 'bg-slate-50 border-slate-200 text-slate-700',
  }[tone];
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex gap-2.5 p-3.5 rounded-xl border text-sm leading-relaxed ${styles}`}>
      <Icon className="w-4.5 h-4.5 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
};

export const GoogleButton: React.FC<{ href: string; label: string }> = ({ href, label }) => (
  <a
    href={href}
    className="w-full h-12 rounded-xl border border-slate-300 hover:border-slate-400 hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-semibold text-[15px] transition-colors flex items-center justify-center gap-3"
  >
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
    {label}
  </a>
);

export const OrDivider: React.FC = () => (
  <div className="flex items-center gap-3 my-6" aria-hidden="true">
    <span className="flex-1 h-px bg-slate-200" />
    <span className="text-xs font-medium uppercase tracking-wider text-slate-400">or</span>
    <span className="flex-1 h-px bg-slate-200" />
  </div>
);

export const PageSpinner: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-label="Loading">
    <Loader2 className="w-7 h-7 text-teal-600 animate-spin" />
  </div>
);
