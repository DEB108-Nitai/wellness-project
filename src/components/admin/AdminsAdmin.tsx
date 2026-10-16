import React, { useCallback, useEffect, useState } from 'react';
import { Crown, Loader2, UserMinus, UserPlus } from 'lucide-react';
import { Team, TeamAdmin, usersAdminApi } from '../../api/admin';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { CodeField } from '../auth/TwoFactorParts';
import { Badge, btn, ErrorBox, fieldErrors, fmtWhen, Input, LoadingBlock, Modal, PageHeader } from './ui';

/**
 * The admin team (slice F2): several admins can work at once; only the primary admin adds or removes admins or
 * hands the primary role over, each time confirmed with a code from their authenticator app. Everyone else sees
 * the list read-only. The server enforces the same rules.
 */
type Action = { kind: 'add' } | { kind: 'remove'; admin: TeamAdmin } | { kind: 'primary'; admin: TeamAdmin };

export const AdminsAdmin: React.FC = () => {
  const { refresh } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    usersAdminApi
      .team()
      .then(setTeam)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load the admins.'));
  }, []);
  useEffect(load, [load]);

  const primary = team?.admins.find((a) => a.isPrimary);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admins"
        description="Everyone who can open this console. Only the primary admin can add or remove admins, or hand the primary role to someone else."
        actions={
          team?.youArePrimary && (
            <button onClick={() => setAction({ kind: 'add' })} className={btn.primary}>
              <UserPlus className="w-4 h-4" aria-hidden="true" /> Add admin
            </button>
          )
        }
      />
      {notice && (
        <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-900">
          {notice}
        </p>
      )}
      {team && !team.youArePrimary && (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700">
          {primary ? (
            <>
              Only the primary admin, <strong>{primary.name}</strong>, can add or remove admins. Ask them if someone needs access.
            </>
          ) : (
            'There is no primary admin. The person who runs the server can set one with create-admin.php --primary.'
          )}
        </p>
      )}
      {error && <ErrorBox onRetry={load}>{error}</ErrorBox>}
      {!team && !error && <LoadingBlock />}
      {team && (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Admins">
          {team.admins.map((a) => (
            <li key={a.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 break-words">
                  {a.name} {a.isYou && <span className="text-slate-400 font-normal">(you)</span>}
                </p>
                <p className="text-xs text-slate-500 break-all">{a.email}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {a.isPrimary ? (
                  <Badge tone="indigo">
                    <span className="inline-flex items-center gap-1">
                      <Crown className="w-3 h-3" aria-hidden="true" /> Primary admin
                    </span>
                  </Badge>
                ) : (
                  <Badge>Admin</Badge>
                )}
                {a.twoStep ? <Badge tone="teal">Two-step sign-in on</Badge> : <Badge tone="amber">Not signed in yet</Badge>}
                {a.status === 'disabled' && <Badge tone="rose">Disabled</Badge>}
              </div>
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-slate-400">Added</dt>
                  <dd className="text-slate-700">{a.addedAt ? `${new Date(a.addedAt).toLocaleDateString()}${a.addedBy ? ` by ${a.addedBy}` : ' (server)'}` : 'From the server'}</dd>
                </div>
                <div>
                  <dt className="text-slate-400">Last sign-in</dt>
                  <dd className="text-slate-700">{fmtWhen(a.lastLoginAt)}</dd>
                </div>
              </dl>
              {team.youArePrimary && !a.isPrimary && (
                <div className="mt-auto flex flex-wrap gap-2 pt-1">
                  {(!a.twoStep || a.status !== 'active') && (
                    <p className="w-full text-xs text-slate-500">
                      {a.status !== 'active' ? 'Disabled: enable the account before making them primary.' : 'They can become primary after their first sign-in with two-step sign-in.'}
                    </p>
                  )}
                  <button onClick={() => setAction({ kind: 'primary', admin: a })} className={btn.secondary} disabled={!a.twoStep || a.status !== 'active'}>
                    <Crown className="w-4 h-4" aria-hidden="true" /> Make primary
                  </button>
                  <button onClick={() => setAction({ kind: 'remove', admin: a })} className={btn.secondary}>
                    <UserMinus className="w-4 h-4" aria-hidden="true" /> Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {action && (
        <TeamDialog
          action={action}
          onClose={() => setAction(null)}
          onDone={(t, message) => {
            setAction(null);
            setTeam(t);
            setNotice(message);
            if (action.kind === 'primary') void refresh(); // this admin is no longer the primary one
          }}
        />
      )}
    </div>
  );
};

const TeamDialog: React.FC<{ action: Action; onClose: () => void; onDone: (t: Team, message: string) => void }> = ({ action, onClose, onDone }) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);

  const text = {
    add: {
      title: 'Add an admin',
      intro: 'The person needs an account on this site with a confirmed email address. They are signed out, and at their next sign-in they set up two-step sign-in on their phone.',
      submit: 'Add admin',
    },
    remove: {
      title: action.kind === 'remove' ? `Remove ${action.admin.name}’s admin access?` : '',
      intro: 'Their account stays as a normal member account. They are signed out straight away, and their two-step sign-in is reset.',
      submit: 'Remove admin access',
    },
    primary: {
      title: action.kind === 'primary' ? `Make ${action.admin.name} the primary admin?` : '',
      intro: 'They become the only admin who can add or remove admins. You stay an admin, but you can no longer change the team.',
      submit: 'Hand over the primary role',
    },
  }[action.kind];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      if (action.kind === 'add') {
        onDone(await usersAdminApi.addAdmin(email.trim(), code), `${email.trim()} is now an admin. They have been emailed.`);
      } else if (action.kind === 'remove') {
        onDone(await usersAdminApi.removeAdmin(action.admin.id, code), `${action.admin.name} is no longer an admin.`);
      } else {
        onDone(await usersAdminApi.makePrimary(action.admin.id, code), `${action.admin.name} is now the primary admin.`);
      }
    } catch (err) {
      const f = fieldErrors(err);
      setErrors(f.fields);
      setMessage(f.message);
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={text.title}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>
            Cancel
          </button>
          <button type="submit" form="team-form" disabled={busy || code.trim() === '' || (action.kind === 'add' && email.trim() === '')} className={action.kind === 'remove' ? btn.danger : btn.primary}>
            {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            {text.submit}
          </button>
        </>
      }
    >
      <form id="team-form" onSubmit={submit} className="space-y-4" noValidate>
        <p className="text-sm text-slate-600">{text.intro}</p>
        {action.kind === 'add' && <Input label="Their email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} autoComplete="off" />}
        <CodeField value={code} onChange={(v) => setCode(v.toUpperCase().slice(0, 11))} recovery label="Your code from the authenticator app (or a recovery code)" error={errors.code} />
        {message && <ErrorBox>{message}</ErrorBox>}
      </form>
    </Modal>
  );
};
