import React, { useEffect, useId, useRef } from 'react';
import { Loader2, X } from 'lucide-react';

/**
 * Small shared building blocks for the admin console (Phase 5), in the site's teal/slate language.
 * Panels reuse these instead of re-styling tables, dialogs and fields each time.
 */

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-colors focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/25',
  secondary:
    'inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold disabled:opacity-60 cursor-pointer transition-colors focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/15',
  danger:
    'inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-60 cursor-pointer transition-colors focus:outline-hidden focus-visible:ring-4 focus-visible:ring-rose-500/25',
  icon: 'inline-flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer transition-colors focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/15',
};

export const PageHeader: React.FC<{ title: string; description?: React.ReactNode; actions?: React.ReactNode }> = ({ title, description, actions }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="space-y-1 min-w-0">
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-heading">{title}</h1>
      {description && <p className="text-sm text-slate-600 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
  </div>
);

export const Panel: React.FC<{ title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }> = ({
  title,
  actions,
  children,
  className = '',
}) => (
  <section className={`bg-white rounded-2xl border border-slate-200 shadow-xs ${className}`}>
    {(title || actions) && (
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 border-b border-slate-100">
        {title && <h2 className="text-sm font-bold text-slate-900">{title}</h2>}
        {actions}
      </div>
    )}
    <div className="p-5">{children}</div>
  </section>
);

export const StatTile: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode }> = ({ label, value, hint }) => (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className="mt-1 text-3xl font-bold text-slate-900 font-heading tabular-nums">{value}</p>
    {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
  </div>
);

export const Badge: React.FC<{ tone?: 'teal' | 'slate' | 'amber' | 'rose' | 'indigo'; children: React.ReactNode }> = ({ tone = 'slate', children }) => {
  const tones = {
    teal: 'bg-teal-50 text-teal-800 border-teal-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
    amber: 'bg-amber-50 text-amber-800 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
};

export const LoadingBlock: React.FC<{ label?: string }> = ({ label = 'Loading…' }) => (
  <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
    <Loader2 className="w-5 h-5 animate-spin text-teal-600" aria-hidden="true" /> {label}
  </div>
);

export const EmptyState: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="text-center py-12 px-4 space-y-1.5">
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {children && <div className="text-sm text-slate-500">{children}</div>}
  </div>
);

export const ErrorBox: React.FC<{ children: React.ReactNode; onRetry?: () => void }> = ({ children, onRetry }) => (
  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-center justify-between gap-3">
    <span>{children}</span>
    {onRetry && (
      <button onClick={onRetry} className="font-semibold underline underline-offset-2 cursor-pointer">
        Try again
      </button>
    )}
  </div>
);

// ------------------------------------------------------------------ dialogs

/** Accessible modal: Escape and the ✕ close it, focus moves inside, the page behind doesn't scroll. */
export const Modal: React.FC<{
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}> = ({ title, onClose, children, footer, wide }) => {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
  // Latest onClose without re-running the effect (which would move focus) on every parent render.
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current();
      // Keep Tab inside the dialog.
      if (e.key === 'Tab' && box.current) {
        const items = [...box.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]):not(.sr-only), select, textarea, label[for]')];
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    box.current?.querySelector<HTMLElement>('input, textarea, select, button[data-autofocus]')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      opener?.focus?.(); // back to the button that opened it
    };
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`bg-white w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'} rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col`}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
          <h2 id={titleId} className="text-lg font-bold text-slate-900 font-heading">
            {title}
          </h2>
          <button onClick={onClose} className={btn.icon} aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 pb-4 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-slate-100 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

export const ConfirmDialog: React.FC<{
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ title, message, confirmLabel, busy, error, onConfirm, onCancel }) => (
  <Modal
    title={title}
    onClose={onCancel}
    footer={
      <>
        <button onClick={onCancel} className={btn.secondary} data-autofocus>
          Cancel
        </button>
        <button onClick={onConfirm} disabled={busy} className={btn.danger}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {confirmLabel}
        </button>
      </>
    }
  >
    <div className="space-y-3 text-sm text-slate-600">
      {message}
      {error && <ErrorBox>{error}</ErrorBox>}
    </div>
  </Modal>
);

// ------------------------------------------------------------------ fields

const control =
  'w-full rounded-xl border bg-white px-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-4 transition-shadow';
const controlState = (error?: string) =>
  error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-500/15';

interface FieldShell {
  label: string;
  error?: string;
  hint?: React.ReactNode;
}

const Shell: React.FC<FieldShell & { id: string; children: React.ReactNode }> = ({ id, label, error, hint, children }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-medium text-slate-700">
      {label}
    </label>
    {children}
    {error ? (
      <p id={`${id}-msg`} className="text-xs text-rose-600">
        {error}
      </p>
    ) : (
      hint && (
        <p id={`${id}-msg`} className="text-xs text-slate-500">
          {hint}
        </p>
      )
    )}
  </div>
);

export const Input: React.FC<FieldShell & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'>> = ({ label, error, hint, className = '', ...rest }) => {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={`${control} h-11 ${controlState(error)} ${className}`}
        {...rest}
      />
    </Shell>
  );
};

export const TextArea: React.FC<FieldShell & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'>> = ({ label, error, hint, className = '', ...rest }) => {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={`${control} py-2.5 leading-relaxed ${controlState(error)} ${className}`}
        {...rest}
      />
    </Shell>
  );
};

export const Select: React.FC<FieldShell & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'>> = ({ label, error, hint, className = '', children, ...rest }) => {
  const id = useId();
  return (
    <Shell id={id} label={label} error={error} hint={hint}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={`${control} h-11 ${controlState(error)} ${className}`}
        {...rest}
      >
        {children}
      </select>
    </Shell>
  );
};

/** On/off switch (e.g. "Published"). */
export const Toggle: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }> = ({ label, checked, onChange, hint }) => (
  <label className="flex items-start gap-3 cursor-pointer select-none">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`mt-0.5 relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/25 ${checked ? 'bg-teal-600' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
    <span className="text-sm">
      <span className="font-medium text-slate-800">{label}</span>
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </span>
  </label>
);

/** Map an API 422 onto field messages; anything else becomes a general message. */
export function fieldErrors(err: unknown): { fields: Record<string, string>; message: string | null } {
  if (err && typeof err === 'object' && 'fields' in err && 'message' in err) {
    const e = err as { fields: Record<string, string>; message: string };
    return Object.keys(e.fields).length ? { fields: e.fields, message: null } : { fields: {}, message: e.message };
  }
  return { fields: {}, message: 'Something went wrong. Please try again.' };
}
