import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, RotateCcw, Search, Send } from 'lucide-react';
import { MessageDetail, MessageFilters, MessageRow, MessageStatus, Paged, siteAdminApi } from '../../api/admin';
import { ApiError } from '../../api/client';
import { useSettings } from '../../context/SettingsContext';
import { Badge, btn, EmptyState, ErrorBox, filterControl, fmtWhen, LoadingBlock, Modal, PageHeader, Pager, RangeChoice, RangePicker, rangeDates, TextArea, useClampPage, useDebounced } from './ui';

/** Contact-form messages (PRD ADM-5): read, reply from the console (sent from the support address), mark handled. New ones also show on the Overview. */
type Data = Paged<MessageRow> & { counts: Record<MessageStatus, number> };

export const MessagesAdmin: React.FC = () => {
  const [status, setStatus] = useState<MessageStatus | ''>('new');
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [range, setRange] = useState<{ range: RangeChoice; from: string; to: string }>({ range: 'all', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [reload, setReload] = useState(0);

  const filters: MessageFilters = useMemo(
    () => ({ status: status || undefined, q: q || undefined, ...rangeDates(range.range, range.from, range.to) }),
    [status, q, range],
  );
  const key = JSON.stringify(filters);
  useEffect(() => setPage(1), [key]);
  useClampPage(data, setPage);

  useEffect(() => {
    let alive = true;
    setError(null);
    siteAdminApi
      .messages({ ...filters, page })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : 'Could not load the messages.'));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page, reload]);

  const tabs: { value: MessageStatus | ''; label: string }[] = [
    { value: 'new', label: `New${data ? ` (${data.counts.new})` : ''}` },
    { value: 'handled', label: `Handled${data ? ` (${data.counts.handled})` : ''}` },
    { value: '', label: 'All' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Messages"
        description="Everything sent through the Contact form. Open a message to reply: the reply is emailed from the support address and the message is marked handled, so everyone on the team knows."
        actions={
          <a href={siteAdminApi.messagesCsvUrl(filters)} className={btn.secondary}>
            <Download className="w-4 h-4" aria-hidden="true" /> Export CSV
          </a>
        }
      />

      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.value || 'all'}
            role="tab"
            aria-selected={status === t.value}
            onClick={() => setStatus(t.value)}
            className={`h-11 px-4 text-sm font-semibold border-b-2 -mb-px cursor-pointer ${status === t.value ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="relative flex-1 min-w-[14rem]">
          <span className="sr-only">Search messages</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, subject or text" className={`${filterControl} w-full pl-9`} />
        </label>
        <RangePicker {...range} onChange={setRange} label="Received" />
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
      {!data && !error && <LoadingBlock />}
      {data && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" aria-label="Messages">
          {data.items.length === 0 ? (
            <EmptyState title={status === 'new' && !q ? 'No new messages.' : 'No messages match these filters.'}>
              {status === 'new' && !q ? 'Everything has been handled.' : undefined}
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.items.map((m) => (
                <li key={m.id}>
                  <button onClick={() => setOpen(m.id)} className="w-full text-left px-5 py-4 hover:bg-slate-50 focus:outline-hidden focus-visible:bg-teal-50 cursor-pointer">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={`text-sm ${m.status === 'new' ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>{m.name}</span>
                      <span className="text-xs text-slate-500 truncate">{m.email}</span>
                      <span className="ml-auto text-xs text-slate-400 whitespace-nowrap">{fmtWhen(m.createdAt)}</span>
                    </div>
                    <p className={`mt-1 text-sm ${m.status === 'new' ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
                      {m.status === 'new' && (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full bg-teal-600 mr-2 align-middle" aria-hidden="true" />
                          <span className="sr-only">New: </span>
                        </>
                      )}
                      {m.subject}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{m.preview}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pager page={data.page} perPage={data.perPage} total={data.total} onPage={setPage} />
        </section>
      )}

      {open !== null && <MessageDialog id={open} onClose={() => setOpen(null)} onChanged={() => setReload((n) => n + 1)} />}
    </div>
  );
};

const MessageDialog: React.FC<{ id: number; onClose: () => void; onChanged: () => void }> = ({ id, onClose, onChanged }) => {
  const { settings } = useSettings();
  const [m, setM] = useState<MessageDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState('');
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sentNote, setSentNote] = useState(false);

  useEffect(() => {
    let alive = true;
    siteAdminApi
      .message(id)
      .then((d) => alive && setM(d))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Could not open the message.'));
    return () => {
      alive = false;
    };
  }, [id]);

  const setStatus = async (status: MessageStatus) => {
    setBusy(true);
    setError(null);
    try {
      setM(await siteAdminApi.setMessageStatus(id, status));
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update the message.');
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (reply.trim().length < 2) {
      setReplyError('Please write your reply first.');
      return;
    }
    setBusy(true);
    setReplyError(null);
    setSentNote(false);
    try {
      setM(await siteAdminApi.replyToMessage(id, reply.trim()));
      setReply('');
      setSentNote(true);
      onChanged();
    } catch (e) {
      setReplyError(e instanceof ApiError ? (e.fields.body ?? e.message) : 'Could not send the reply.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={m?.subject ?? 'Message'}
      onClose={onClose}
      wide
      footer={
        m && (
          <>
            {m.status === 'new' ? (
              <button onClick={() => setStatus('handled')} disabled={busy} className={btn.secondary}>
                <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Mark handled
              </button>
            ) : (
              <button onClick={() => setStatus('new')} disabled={busy} className={btn.secondary}>
                <RotateCcw className="w-4 h-4" aria-hidden="true" /> Mark as new
              </button>
            )}
            <button onClick={sendReply} disabled={busy || reply.trim() === ''} className={btn.primary}>
              <Send className="w-4 h-4" aria-hidden="true" /> {busy ? 'Sending…' : 'Send reply'}
            </button>
          </>
        )
      }
    >
      {error && <ErrorBox>{error}</ErrorBox>}
      {!m && !error && <LoadingBlock />}
      {m && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-900">{m.name}</span>
            <span className="text-slate-600 break-all select-all">{m.email}</span>
            <span className="ml-auto">{m.status === 'new' ? <Badge tone="teal">New</Badge> : <Badge>Handled</Badge>}</span>
          </div>
          <p className="text-xs text-slate-500">
            Received {fmtWhen(m.createdAt)}
            {m.handledAt && ` · handled ${fmtWhen(m.handledAt)}${m.handledBy ? ` by ${m.handledBy}` : ''}`}
          </p>
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-800 whitespace-pre-wrap break-words">{m.message}</div>
          {m.replies.length > 0 && (
            <section aria-label="Replies sent" className="space-y-3">
              {m.replies.map((r) => (
                <div key={r.id} className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
                  <p className="text-xs font-semibold text-teal-800">
                    Reply sent {fmtWhen(r.sentAt)}
                    {r.sentBy ? ` by ${r.sentBy}` : ''}
                  </p>
                  <p className="mt-2 text-sm text-slate-800 whitespace-pre-wrap break-words">{r.body}</p>
                </div>
              ))}
            </section>
          )}
          {sentNote && (
            <p role="status" className="flex items-center gap-2 text-sm font-medium text-teal-800">
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Reply sent to {m.email}.
            </p>
          )}
          <TextArea
            label={m.replies.length ? 'Write another reply' : 'Your reply'}
            rows={6}
            maxLength={5000}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            error={replyError ?? undefined}
            hint={`Sent to ${m.email} from ${settings.support_email || 'the support address'}, with their message quoted below it. Their answer comes back to that inbox. Sending marks the message handled.`}
          />
        </div>
      )}
    </Modal>
  );
};
