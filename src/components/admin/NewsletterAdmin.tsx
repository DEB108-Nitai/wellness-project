import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight, Plus } from 'lucide-react';
import { ApiError } from '../../api/client';
import { newsletterAdminApi, NewsletterRow } from '../../api/admin';
import { SubscribersAdmin } from './SubscribersAdmin';
import { Badge, btn, EmptyState, ErrorBox, fmtWhen, LoadingBlock, PageHeader } from './ui';

/**
 * Newsletter (owner, 2026-10-22): write and send newsletters, and see who is subscribed.
 * Two tabs; the tab is in the address (?tab=subscribers) so it survives a reload and can be linked.
 */
export const NewsletterAdmin: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'subscribers' ? 'subscribers' : 'newsletters';
  const tabs = [
    { value: 'newsletters', label: 'Newsletters' },
    { value: 'subscribers', label: 'Subscribers' },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Newsletter"
        description="Write a newsletter, preview it, send yourself a test, then send it to everyone subscribed. Each email has its own unsubscribe link."
      />
      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setParams(t.value === 'subscribers' ? { tab: 'subscribers' } : {}, { replace: true })}
            className={`h-11 px-4 text-sm font-semibold border-b-2 -mb-px cursor-pointer ${tab === t.value ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'subscribers' ? <SubscribersAdmin /> : <NewsletterList />}
    </div>
  );
};

export const statusBadge = (n: Pick<NewsletterRow, 'status' | 'sent' | 'recipients'>) =>
  n.status === 'draft' ? (
    <Badge tone="amber">Draft</Badge>
  ) : n.status === 'sending' ? (
    <Badge tone="indigo">
      Sending · {n.sent} of {n.recipients}
    </Badge>
  ) : (
    <Badge tone="teal">Sent</Badge>
  );

const NewsletterList: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<NewsletterRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setError(null);
    newsletterAdminApi
      .list()
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load the newsletters.'));
  };
  useEffect(load, []);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const n = await newsletterAdminApi.create();
      navigate(`/admin/newsletter/${n.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start a newsletter.');
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={create} disabled={creating} className={btn.primary}>
          <Plus className="w-4 h-4" aria-hidden="true" /> {creating ? 'Starting…' : 'New newsletter'}
        </button>
      </div>
      {error && <ErrorBox onRetry={load}>{error}</ErrorBox>}
      {!items && !error && <LoadingBlock />}
      {items && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" aria-label="Newsletters">
          {items.length === 0 ? (
            <EmptyState title="No newsletters yet.">Press New newsletter to write the first one.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <li key={n.id}>
                  <Link to={`/admin/newsletter/${n.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 focus:outline-hidden focus-visible:bg-teal-50">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-semibold ${n.subject ? 'text-slate-900' : 'text-slate-500 italic'}`}>{n.subject || 'Untitled draft'}</span>
                        {statusBadge(n)}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {n.status === 'draft'
                          ? `Last edited ${fmtWhen(n.updatedAt)}`
                          : `Sent ${fmtWhen(n.queuedAt)}${n.sentBy ? ` by ${n.sentBy}` : ''} · ${n.sent} of ${n.recipients} delivered${n.failed ? ` · ${n.failed} failed` : ''}`}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
};
