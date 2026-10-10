import React, { useEffect, useState } from 'react';
import { CalendarCheck, CheckCircle2, LogOut, Mail, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { authApi } from '../api/auth';
import { challengeApi, Registration } from '../api/challenge';
import { useAuth } from '../context/AuthContext';
import { FormAlert, PasswordField, SubmitButton, TextField } from '../components/auth/FormControls';

const Section: React.FC<{ icon: React.ElementType; title: string; description: string; children: React.ReactNode }> = ({
  icon: Icon,
  title,
  description,
  children,
}) => (
  <section className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 grid md:grid-cols-[220px_1fr] gap-6">
    <div className="space-y-2">
      <span className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center">
        <Icon className="w-5 h-5 text-teal-700" />
      </span>
      <h2 className="text-lg font-bold text-slate-900 font-heading">{title}</h2>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </div>
    <div>{children}</div>
  </section>
);

export const AccountPage: React.FC = () => {
  const { user, applySession, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name ?? '');
  const [profileMsg, setProfileMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [savingPassword, setSavingPassword] = useState(false);

  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<Registration[] | null>(null);

  useEffect(() => {
    challengeApi.mine().then(setRegistrations).catch(() => setRegistrations([]));
  }, []);

  if (!user) return null; // guarded by <RequireAuth>

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErrors({});
    setSavingProfile(true);
    try {
      applySession(await authApi.updateProfile(name.trim()));
      setProfileMsg({ tone: 'success', text: 'Your name has been updated.' });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setProfileErrors(err.fields);
      else setProfileMsg({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not save. Please try again.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordErrors({});
    setSavingPassword(true);
    try {
      applySession(await authApi.changePassword(newPassword, user.hasPassword ? currentPassword : undefined));
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMsg({ tone: 'success', text: 'Password saved. You have been signed out on your other devices.' });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setPasswordErrors(err.fields);
      else setPasswordMsg({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not save. Please try again.' });
    } finally {
      setSavingPassword(false);
    }
  };

  const resend = async () => {
    try {
      setVerifyMsg((await authApi.resendVerification()).message);
    } catch (err) {
      setVerifyMsg(err instanceof ApiError ? err.message : 'Could not send a new link. Please try again later.');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 mb-2">
        <div>
          <p className="text-sm font-semibold text-teal-700">My account</p>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Hello, {user.name.split(' ')[0]}</h1>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </header>

      <Section icon={User} title="Profile" description="The name shown on your personality report.">
        <form onSubmit={saveProfile} className="space-y-4 max-w-md" noValidate>
          {profileMsg && <FormAlert tone={profileMsg.tone}>{profileMsg.text}</FormAlert>}
          <TextField
            label="Full name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={profileErrors.name}
            maxLength={100}
          />
          <div className="w-40">
            <SubmitButton loading={savingProfile} disabled={name.trim() === user.name}>
              Save
            </SubmitButton>
          </div>
        </form>
      </Section>

      <Section icon={Mail} title="Email" description="Used to sign in and to recover your account.">
        <div className="space-y-3 max-w-md">
          <p className="text-[15px] font-semibold text-slate-900 break-all">{user.email}</p>
          {user.emailVerified ? (
            <p className="inline-flex items-center gap-1.5 text-sm text-emerald-700">
              <CheckCircle2 className="w-4 h-4" /> Verified
            </p>
          ) : verifyMsg ? (
            <FormAlert tone="info">{verifyMsg}</FormAlert>
          ) : (
            <p className="text-sm text-amber-700">
              Not verified yet.{' '}
              <button onClick={resend} className="font-semibold underline cursor-pointer">
                Send verification link
              </button>
            </p>
          )}
          {user.hasGoogle && <p className="text-sm text-slate-500">Google sign-in is connected to this account.</p>}
        </div>
      </Section>

      <Section icon={CalendarCheck} title="My 60-Day Challenges" description="Programs you have registered for.">
        {registrations === null ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : registrations.length === 0 ? (
          <p className="text-sm text-slate-500">
            You haven't joined a challenge yet.{' '}
            <a href="/#60-days-challenge" className="font-semibold text-teal-700 underline">
              Explore the 60-Day Challenges
            </a>
          </p>
        ) : (
          <ul className="space-y-2.5 max-w-md">
            {registrations.map((r) => (
              <li key={r.ref} className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{r.programName}</p>
                  <p className="text-xs font-mono text-slate-400">{r.ref}</p>
                </div>
                <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        icon={ShieldCheck}
        title={user.hasPassword ? 'Change password' : 'Set a password'}
        description={
          user.hasPassword
            ? 'Changing it signs you out everywhere else.'
            : 'You sign in with Google. Add a password to also sign in with your email.'
        }
      >
        <form onSubmit={savePassword} className="space-y-4 max-w-md" noValidate>
          {passwordMsg && <FormAlert tone={passwordMsg.tone}>{passwordMsg.text}</FormAlert>}
          {user.hasPassword && (
            <PasswordField
              label="Current password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              error={passwordErrors.currentPassword}
            />
          )}
          <PasswordField
            label="New password"
            autoComplete="new-password"
            showStrength
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={passwordErrors.newPassword}
            maxLength={128}
          />
          <div className="w-48">
            <SubmitButton loading={savingPassword} disabled={newPassword.length === 0}>
              {user.hasPassword ? 'Change password' : 'Set password'}
            </SubmitButton>
          </div>
        </form>
      </Section>
    </div>
  );
};
