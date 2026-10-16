import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, KeyRound, Loader2, Smartphone } from 'lucide-react';
import { SecurityStatus, securityApi } from '../../api/admin';
import { AuthenticatorQr, CodeField, RecoveryCodesList } from '../auth/TwoFactorParts';
import { Badge, btn, ErrorBox, fieldErrors, LoadingBlock, Modal, PageHeader, Panel } from './ui';

/** The signed-in admin's own two-step sign-in (ADM-12): status, new recovery codes, moving to a new phone. */

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Asks for a current code first (from the app, or a recovery code for a lost phone). */
const StepUpForm: React.FC<{ intro: string; busy: boolean; error?: string; message: string | null; onSubmit: (code: string) => void; onCancel: () => void; submitLabel: string }> = ({
  intro,
  busy,
  error,
  message,
  onSubmit,
  onCancel,
  submitLabel,
}) => {
  const [code, setCode] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(code);
      }}
      className="space-y-4"
      noValidate
    >
      <p className="text-sm text-slate-600">{intro}</p>
      {message && <ErrorBox>{message}</ErrorBox>}
      <CodeField value={code} onChange={(v) => setCode(v.toUpperCase().slice(0, 11))} recovery label="Code from your app, or a recovery code" error={error} autoFocus />
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <button type="button" onClick={onCancel} className={btn.secondary}>
          Cancel
        </button>
        <button type="submit" disabled={busy || code.trim() === ''} className={btn.primary}>
          {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

const NewCodesDialog: React.FC<{ onClose: () => void; onDone: () => void }> = ({ onClose, onDone }) => {
  const [codes, setCodes] = useState<string[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field?: string; message: string | null }>({ message: null });

  const submit = async (code: string) => {
    setBusy(true);
    setErr({ message: null });
    try {
      setCodes((await securityApi.regenerateRecoveryCodes(code)).recoveryCodes);
      onDone();
    } catch (e) {
      const f = fieldErrors(e);
      setErr({ field: f.fields.code, message: f.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="New recovery codes" onClose={codes && !saved ? () => undefined : onClose}>
      {codes ? (
        <div className="space-y-5 pb-2">
          <p className="text-sm text-slate-600">Your old recovery codes no longer work. Save these now: this is the only time they are shown.</p>
          <RecoveryCodesList codes={codes} saved={saved} onSavedChange={setSaved} />
          <div className="flex justify-end">
            <button type="button" disabled={!saved} onClick={onClose} className={btn.primary}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <StepUpForm
          intro="This replaces all your recovery codes, used or not. First confirm it is you."
          busy={busy}
          error={err.field}
          message={err.message}
          onSubmit={submit}
          onCancel={onClose}
          submitLabel="Create new codes"
        />
      )}
    </Modal>
  );
};

const NewPhoneDialog: React.FC<{ onClose: () => void; onDone: (s: SecurityStatus) => void }> = ({ onClose, onDone }) => {
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [done, setDone] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field?: string; message: string | null }>({ message: null });

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setErr({ message: null });
    try {
      await fn();
    } catch (e) {
      const f = fieldErrors(e);
      setErr({ field: f.fields.code, message: f.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Move to a new phone" onClose={onClose} wide={!!setup && !done}>
      {done ? (
        <div className="space-y-4 pb-2">
          <p className="flex items-start gap-2 text-sm text-slate-700">
            <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" aria-hidden="true" />
            Your new phone is set up. Codes from the old phone no longer work, and your other devices were signed out.
          </p>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className={btn.primary} data-autofocus>
              Done
            </button>
          </div>
        </div>
      ) : setup ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              onDone(await securityApi.confirmReplace(code));
              setDone(true);
            });
          }}
          className="space-y-5 pb-2"
          noValidate
        >
          <p className="text-sm text-slate-600">In the authenticator app on your new phone, add an account and scan this code. Then enter the 6-digit code it shows.</p>
          {err.message && <ErrorBox>{err.message}</ErrorBox>}
          <AuthenticatorQr secret={setup.secret} uri={setup.uri} />
          <CodeField value={code} onChange={setCode} error={err.field} label="6-digit code from the new phone" />
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={onClose} className={btn.secondary}>
              Cancel
            </button>
            <button type="submit" disabled={busy || code.trim() === ''} className={btn.primary}>
              {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Use the new phone
            </button>
          </div>
        </form>
      ) : (
        <StepUpForm
          intro="First confirm it is you with a code from your current app. If you lost that phone, use one of your recovery codes."
          busy={busy}
          error={err.field}
          message={err.message}
          onSubmit={(c) => void run(async () => setSetup(await securityApi.startReplace(c)))}
          onCancel={onClose}
          submitLabel="Continue"
        />
      )}
    </Modal>
  );
};

export const SecurityAdmin: React.FC = () => {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'codes' | 'phone' | null>(null);

  const load = useCallback(() => {
    setError(null);
    securityApi
      .status()
      .then(setStatus)
      .catch((e) => setError(fieldErrors(e).message ?? 'Could not load your security settings.'));
  }, []);
  useEffect(load, [load]);

  const left = status?.recoveryCodesLeft ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Security" description="Two-step sign-in protects the admin console: signing in needs your password (or Google) and a code from the authenticator app on your phone." />
      {error && <ErrorBox onRetry={load}>{error}</ErrorBox>}
      {!status && !error && <LoadingBlock />}
      {status && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Two-step sign-in">
            <div className="space-y-4">
              <p className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <Badge tone="teal">On</Badge>
                {status.enabledAt && <span>Authenticator app set up on {fmtDate(status.enabledAt)}</span>}
              </p>
              <p className="text-sm text-slate-600">New phone, or lost your phone? Move two-step sign-in to the new one. Your other devices are signed out when you do.</p>
              <button type="button" onClick={() => setDialog('phone')} className={btn.secondary}>
                <Smartphone className="w-4 h-4" aria-hidden="true" /> Move to a new phone
              </button>
            </div>
          </Panel>
          <Panel title="Recovery codes">
            <div className="space-y-4">
              <p className="text-sm text-slate-700">
                <strong className="text-2xl font-bold text-slate-900 tabular-nums mr-1.5">{left}</strong> of 10 left
              </p>
              {left <= 3 && (
                <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  {left === 0 ? 'You have no recovery codes left.' : 'You are running low on recovery codes.'} Create a new set so you can still sign in if you lose your phone.
                </p>
              )}
              <p className="text-sm text-slate-600">Each code signs you in once if you don’t have your phone. A new set replaces all the old codes.</p>
              <button type="button" onClick={() => setDialog('codes')} className={btn.secondary}>
                <KeyRound className="w-4 h-4" aria-hidden="true" /> Create new recovery codes
              </button>
            </div>
          </Panel>
        </div>
      )}
      {dialog === 'codes' && <NewCodesDialog onClose={() => setDialog(null)} onDone={load} />}
      {dialog === 'phone' && <NewPhoneDialog onClose={() => setDialog(null)} onDone={setStatus} />}
    </div>
  );
};
