import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Search, ShieldCheck, UserX } from 'lucide-react';
import { AdminUserDetail, AdminUserRow, AUDIT_LABELS, Paged, UserFilters, usersAdminApi } from '../../api/admin';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { STATUS_LABEL } from './ParticipantsAdmin';
import { Badge, btn, ConfirmDialog, EmptyState, ErrorBox, fieldErrors, filterControl, fmtWhen, Input, LoadingBlock, Modal, PageHeader, Pager, Panel, StatTile, useClampPage, useDebounced } from './ui';

/**
 * Accounts (PRD ADM-6, ADM-11, AUTH-11): find a person, see what is filed under their account, disable or
 * enable it, or anonymise it on an erasure request. Admin rights are changed on the Admins page.
 */
type Data = Paged<AdminUserRow> & { counts: { all: number; admins: number; disabled: number; new30: number } };

export const RoleBadge: React.FC<{ u: Pick<AdminUserRow, 'role' | 'isPrimaryAdmin'> }> = ({ u }) =>
  u.role === 'admin' ? <Badge tone="indigo">{u.isPrimaryAdmin ? 'Primary admin' : 'Admin'}</Badge> : <Badge>Member</Badge>;

const StatusBadge: React.FC<{ u: Pick<AdminUserRow, 'status' | 'anonymised'> }> = ({ u }) =>
  u.anonymised ? <Badge>Anonymised</Badge> : u.status === 'disabled' ? <Badge tone="rose">Disabled</Badge> : <Badge tone="teal">Active</Badge>;

const signInWith = (u: AdminUserRow) => [u.hasPassword && 'Password', u.hasGoogle && 'Google'].filter(Boolean).join(' + ') || '—';

export const UsersAdmin: React.FC = () => {
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [role, setRole] = useState<UserFilters['role'] | ''>('');
  const [status, setStatus] = useState<UserFilters['status'] | ''>('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const filters = useMemo(() => ({ q: q || undefined, role: role || undefined, status: status || undefined }), [q, role, status]);
  const key = JSON.stringify(filters);
  useEffect(() => setPage(1), [key]);
  useClampPage(data, setPage);

  useEffect(() => {
    let alive = true;
    setError(null);
    usersAdminApi
      .list({ ...filters, page })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Could not load the accounts.'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, reload]);

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Every account on the site. Open one to see their tests and registrations, disable it, or anonymise it when someone asks for their data to be erased." />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Accounts" value={data ? data.counts.all : '—'} />
        <StatTile label="New in 30 days" value={data ? data.counts.new30 : '—'} />
        <StatTile label="Admins" value={data ? data.counts.admins : '—'} />
        <StatTile label="Disabled" value={data ? data.counts.disabled : '—'} />
      </div>
      <div className="flex flex-wrap gap-2">
        <label className="relative flex-1 min-w-[14rem]">
          <span className="sr-only">Search accounts</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" className={`${filterControl} w-full pl-9`} />
        </label>
        <select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as UserFilters['role'] | '')} className={filterControl}>
          <option value="">Members and admins</option>
          <option value="user">Members</option>
          <option value="admin">Admins</option>
        </select>
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as UserFilters['status'] | '')} className={filterControl}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="anonymised">Anonymised</option>
        </select>
      </div>

      {error && <ErrorBox onRetry={() => setReload((n) => n + 1)}>{error}</ErrorBox>}
      {!data && !error && <LoadingBlock />}
      {data && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" aria-label="Accounts">
          {data.items.length === 0 ? (
            <EmptyState title="No accounts match these filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 bg-slate-50">
                  <tr>
                    <th className="py-2.5 px-5 font-semibold">Person</th>
                    <th className="py-2.5 pr-3 font-semibold">Role</th>
                    <th className="py-2.5 pr-3 font-semibold">Status</th>
                    <th className="py-2.5 pr-3 font-semibold whitespace-nowrap">Signs in with</th>
                    <th className="py-2.5 pr-3 font-semibold">Joined</th>
                    <th className="py-2.5 pr-5 font-semibold whitespace-nowrap">Last sign-in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-5 min-w-[14rem]">
                        <Link to={`/admin/users/${u.id}`} className="font-semibold text-slate-900 hover:text-teal-700">
                          {u.name}
                        </Link>
                        <span className="block text-xs text-slate-500 break-all">
                          {u.email ?? '—'}
                          {u.email && !u.emailVerified && <span className="ml-1 text-amber-700">(not verified)</span>}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <RoleBadge u={u} />
                      </td>
                      <td className="py-3 pr-3">
                        <StatusBadge u={u} />
                      </td>
                      <td className="py-3 pr-3 text-xs text-slate-600 whitespace-nowrap">{signInWith(u)}</td>
                      <td className="py-3 pr-3 text-xs text-slate-500 whitespace-nowrap">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="py-3 pr-5 text-xs text-slate-500 whitespace-nowrap">{fmtWhen(u.lastLoginAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager page={data.page} perPage={data.perPage} total={data.total} onPage={setPage} />
        </section>
      )}
    </div>
  );
};

/** What this admin may do to this account, and why not (the server checks the same rules). */
function allowed(target: AdminUserRow, me: { id: number; isPrimaryAdmin: boolean } | null): string | null {
  if (!me) return 'Not signed in.';
  if (target.id === me.id) return 'This is your own account.';
  if (target.anonymised) return 'This account was anonymised.';
  if (target.role === 'admin' && target.isPrimaryAdmin) return 'The primary admin’s account can’t be changed here.';
  if (target.role === 'admin' && !me.isPrimaryAdmin) return 'Only the primary admin can change another admin’s account.';
  return null;
}

export const UserDetail: React.FC = () => {
  const { id = '' } = useParams();
  const { user: me } = useAuth();
  const [u, setU] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<'disable' | 'enable' | 'anonymise' | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = React.useCallback(() => {
    setError(null);
    usersAdminApi
      .detail(Number(id))
      .then(setU)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load this account.'));
  }, [id]);
  useEffect(() => {
    setU(null);
    load();
  }, [load]);

  const setStatus = async (status: 'active' | 'disabled') => {
    setBusy(true);
    setActionError(null);
    try {
      await usersAdminApi.setStatus(Number(id), status);
      setConfirm(null);
      setNotice(status === 'disabled' ? 'Account disabled. They were signed out and can’t sign in.' : 'Account enabled. They can sign in again.');
      load();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Could not change the account.');
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorBox>{error}</ErrorBox>
      </div>
    );
  }
  if (!u) return <LoadingBlock />;
  const blocked = allowed(u, me ? { id: me.id, isPrimaryAdmin: me.isPrimaryAdmin } : null);

  return (
    <div className="space-y-6">
      <BackLink />
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading break-words">{u.name}</h1>
          <p className="text-sm text-slate-600 break-all">{u.email ?? 'Email removed (anonymised)'}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <RoleBadge u={u} />
            <StatusBadge u={u} />
            {u.role === 'admin' && (u.twoStep ? <Badge tone="teal">Two-step sign-in on</Badge> : <Badge tone="amber">Two-step sign-in not set up</Badge>)}
          </div>
        </div>
        {!blocked && !u.anonymised && (
          <div className="flex flex-wrap gap-2">
            {u.status === 'active' ? (
              <button onClick={() => setConfirm('disable')} className={btn.secondary}>
                <UserX className="w-4 h-4" aria-hidden="true" /> Disable account
              </button>
            ) : (
              <button onClick={() => setConfirm('enable')} className={btn.secondary}>
                <ShieldCheck className="w-4 h-4" aria-hidden="true" /> Enable account
              </button>
            )}
          </div>
        )}
      </div>
      {notice && (
        <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-900">
          {notice}
        </p>
      )}
      {blocked && !u.anonymised && <p className="text-xs text-slate-500">{blocked}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Account">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Joined', fmtWhen(u.createdAt)],
              ['Last sign-in', fmtWhen(u.lastLoginAt)],
              ['Email verified', u.emailVerified ? 'Yes' : 'No'],
              ['Signs in with', signInWith(u)],
              ['Contact messages', String(u.messages)],
              ['Newsletter', u.newsletter === 'subscribed' ? 'Subscribed' : u.newsletter === 'unsubscribed' ? 'Unsubscribed' : 'No'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-slate-400">{k}</dt>
                <dd className="font-semibold text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title={`16PF tests (${u.tests.length})`}>
          {u.tests.length === 0 ? (
            <p className="text-xs text-slate-500">No tests.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {u.tests.map((t) => (
                <li key={t.ref} className="flex items-center justify-between gap-2">
                  <Link to={`/admin/participants/${t.ref}`} className="font-mono font-semibold text-teal-700 hover:underline">
                    {t.ref}
                  </Link>
                  <Badge tone={STATUS_LABEL[t.status].tone}>{STATUS_LABEL[t.status].label}</Badge>
                  <span className="text-slate-500">{t.startedAt ? new Date(t.startedAt).toLocaleDateString() : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title={`60-Day registrations (${u.registrations.length})`}>
          {u.registrations.length === 0 ? (
            <p className="text-xs text-slate-500">No registrations.</p>
          ) : (
            <ul className="space-y-2 text-xs">
              {u.registrations.map((r) => (
                <li key={r.ref} className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-slate-800">{r.ref}</span>
                  <Badge>{r.program}</Badge>
                  <span className="text-slate-500 capitalize">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Recent activity">
        {u.activity.length === 0 ? (
          <p className="text-xs text-slate-500">Nothing recorded.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {u.activity.map((a, i) => (
              <li key={i} className="flex justify-between gap-3 py-2">
                <span className="text-slate-800">
                  {AUDIT_LABELS[a.action] ?? a.action}
                  {a.by && <span className="text-slate-500"> · by {a.by}</span>}
                </span>
                <span className="text-xs text-slate-500 whitespace-nowrap">{fmtWhen(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {!blocked && !u.anonymised && u.role === 'user' && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 space-y-3" aria-labelledby="erase-title">
          <h2 id="erase-title" className="text-sm font-bold text-rose-900">
            Erase personal data
          </h2>
          <p className="text-sm text-slate-700">
            For a request to delete someone’s data. Their name, email, nickname and contact details are removed everywhere, their messages and newsletter sign-up are
            deleted, and the account is closed. Their test answers and scores stay, without anything that identifies them, for research. This can’t be undone.
          </p>
          <button onClick={() => setConfirm('anonymise')} className={btn.danger}>
            Anonymise this account
          </button>
        </section>
      )}

      {(confirm === 'disable' || confirm === 'enable') && (
        <ConfirmDialog
          title={confirm === 'disable' ? `Disable ${u.name}’s account?` : `Enable ${u.name}’s account?`}
          message={
            <p>
              {confirm === 'disable'
                ? 'They are signed out everywhere straight away and can’t sign in until the account is enabled again. Nothing is deleted.'
                : 'They can sign in again with their password or Google.'}
            </p>
          }
          confirmLabel={confirm === 'disable' ? 'Disable account' : 'Enable account'}
          busy={busy}
          error={actionError}
          onConfirm={() => setStatus(confirm === 'disable' ? 'disabled' : 'active')}
          onCancel={() => {
            setConfirm(null);
            setActionError(null);
          }}
        />
      )}
      {confirm === 'anonymise' && (
        <AnonymiseDialog
          user={u}
          onClose={() => setConfirm(null)}
          onDone={(d) => {
            setConfirm(null);
            setU(d);
            setNotice('The account was anonymised. Their answers and scores remain, without their personal details.');
          }}
        />
      )}
    </div>
  );
};

const BackLink: React.FC = () => (
  <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800">
    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All users
  </Link>
);

const AnonymiseDialog: React.FC<{ user: AdminUserDetail; onClose: () => void; onDone: (d: AdminUserDetail) => void }> = ({ user, onClose, onDone }) => {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ field?: string; message: string | null }>({ message: null });
  const matches = typed.trim().toLowerCase() === (user.email ?? '').toLowerCase();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr({ message: null });
    try {
      onDone(await usersAdminApi.anonymise(user.id, typed.trim()));
    } catch (e2) {
      const f = fieldErrors(e2);
      setErr({ field: f.fields.confirmEmail, message: f.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Anonymise this account?"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>
            Cancel
          </button>
          <button type="submit" form="anonymise-form" disabled={!matches || busy} className={btn.danger}>
            {busy ? 'Anonymising…' : 'Anonymise for good'}
          </button>
        </>
      }
    >
      <form id="anonymise-form" onSubmit={submit} className="space-y-4" noValidate>
        <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
          <li>Name and email removed; the account is closed and can’t sign in.</li>
          <li>Test nicknames, occupation and own-words gender removed; answers and scores kept for research.</li>
          <li>60-day registrations lose name, email, phone, city, goal and notes.</li>
          <li>Contact messages and the newsletter sign-up are deleted.</li>
        </ul>
        <Input
          label={`Type ${user.email} to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          error={err.field}
        />
        {err.message && <ErrorBox>{err.message}</ErrorBox>}
      </form>
    </Modal>
  );
};
