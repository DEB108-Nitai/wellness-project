import React, { useState } from 'react';
import { MailWarning, X } from 'lucide-react';
import { ApiError } from '../../api/client';
import { authApi } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';

/** Gentle, non-blocking reminder for unverified accounts (owner decision O-1). */
export const VerifyEmailBanner: React.FC = () => {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  if (!user || user.emailVerified || dismissed) return null;

  const resend = async () => {
    setSending(true);
    try {
      setMessage((await authApi.resendVerification()).message);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Could not send a new link. Please try again later.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3 text-sm">
        <MailWarning className="w-4 h-4 shrink-0 text-amber-600" />
        <p className="flex-1">
          {message ?? (
            <>
              Please confirm your email address — we sent a link to <strong className="font-semibold">{user.email}</strong>.{' '}
              <button onClick={resend} disabled={sending} className="font-semibold underline cursor-pointer disabled:opacity-60">
                {sending ? 'Sending…' : 'Resend link'}
              </button>
            </>
          )}
        </p>
        <button onClick={() => setDismissed(true)} className="p-1 rounded-lg hover:bg-amber-100 cursor-pointer" aria-label="Dismiss">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
