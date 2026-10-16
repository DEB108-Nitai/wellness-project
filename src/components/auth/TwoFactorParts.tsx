import React, { useEffect, useId, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download } from 'lucide-react';

/**
 * Pieces shared by the admin second sign-in step (/login/2fa) and the admin Security page (ADM-12):
 * the QR code with its typed-in key, the code box, and the one-time list of recovery codes.
 */

/** Copy text to the clipboard; true when it worked (some browsers refuse outside https or a user click). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

const CopyButton: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const [done, setDone] = useState<boolean | null>(null);
  return (
    <button
      type="button"
      onClick={async () => {
        setDone(await copyText(text));
        window.setTimeout(() => setDone(null), 2500);
      }}
      className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/15"
    >
      {done ? <Check className="w-4 h-4 text-teal-600" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
      {done === true ? 'Copied' : done === false ? 'Copy failed: select the text instead' : label}
    </button>
  );
};

/** The QR code an authenticator app scans, and the same key in groups of four for typing in by hand. */
export const AuthenticatorQr: React.FC<{ secret: string; uri: string }> = ({ secret, uri }) => {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(uri, { width: 384, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [uri]);
  const grouped = secret.match(/.{1,4}/g)?.join(' ') ?? secret;

  return (
    <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
      <div className="shrink-0 w-48 h-48 rounded-2xl border border-slate-200 bg-white p-2 flex items-center justify-center">
        {src ? <img src={src} alt="QR code to scan with your authenticator app" className="w-full h-full" /> : <span className="text-xs text-slate-400">Preparing the QR code…</span>}
      </div>
      <div className="space-y-2 min-w-0 w-full">
        <p className="text-sm text-slate-600">Can’t scan it? In the app, choose to enter a setup key and type this one:</p>
        <p className="font-mono text-sm font-semibold text-slate-900 break-words bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 select-all">
          {grouped}
        </p>
        <CopyButton text={secret} label="Copy the key" />
      </div>
    </div>
  );
};

/** One box for a 6-digit app code, or a recovery code when `recovery` is set. */
export const CodeField: React.FC<{
  value: string;
  onChange: (v: string) => void;
  recovery?: boolean;
  error?: string;
  label?: string;
  autoFocus?: boolean;
}> = ({ value, onChange, recovery = false, error, label, autoFocus }) => {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label ?? (recovery ? 'Recovery code' : '6-digit code')}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(recovery ? e.target.value.toUpperCase().slice(0, 11) : e.target.value.replace(/[^\d ]/g, '').slice(0, 7))}
        inputMode={recovery ? 'text' : 'numeric'}
        autoComplete="one-time-code"
        autoCapitalize={recovery ? 'characters' : 'off'}
        spellCheck={false}
        autoFocus={autoFocus}
        placeholder={recovery ? 'XXXXX-XXXXX' : '123456'}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full h-12 px-4 rounded-xl border bg-white font-mono text-lg tracking-[0.2em] text-slate-900 placeholder:text-slate-300 focus:outline-hidden focus:ring-4 ${
          error ? 'border-rose-400 focus:ring-rose-500/15' : 'border-slate-300 focus:border-teal-500 focus:ring-teal-500/15'
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </div>
  );
};

/** The 10 recovery codes, shown once, with copy, download and an "I have saved them" check. */
export const RecoveryCodesList: React.FC<{ codes: string[]; saved: boolean; onSavedChange: (v: boolean) => void }> = ({ codes, saved, onSavedChange }) => {
  const checkId = useId();
  const text = codes.join('\n');
  const download = () => {
    const blob = new Blob([`Transenigma admin recovery codes\nEach code works once. Keep them somewhere safe.\n\n${text}\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transenigma-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-4">
      <ul className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-[15px] font-semibold text-slate-900" aria-label="Recovery codes">
        {codes.map((c) => (
          <li key={c} className="text-center select-all">
            {c}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <CopyButton text={text} label="Copy all" />
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 cursor-pointer focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/15"
        >
          <Download className="w-4 h-4" aria-hidden="true" /> Download
        </button>
      </div>
      <label htmlFor={checkId} className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
        <input id={checkId} type="checkbox" checked={saved} onChange={(e) => onSavedChange(e.target.checked)} className="mt-0.5 w-5 h-5 accent-teal-600 shrink-0" />
        I have saved my recovery codes somewhere safe.
      </label>
    </div>
  );
};
