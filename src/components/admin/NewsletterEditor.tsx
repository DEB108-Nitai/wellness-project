import React, { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bold,
  CheckCircle2,
  Copy,
  Eye,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  Loader2,
  MailCheck,
  Minus,
  Monitor,
  MousePointerClick,
  Pilcrow,
  Send,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import { ApiError } from '../../api/client';
import { Newsletter, newsletterAdminApi, NewsletterBlock, NewsletterContent } from '../../api/admin';
import { statusBadge } from './NewsletterAdmin';
import { btn, ConfirmDialog, ErrorBox, fieldErrors, fmtWhen, Input, LoadingBlock, Modal, Panel, TextArea } from './ui';

/**
 * Write one newsletter (owner, 2026-10-22): subject, preview text, an optional cover image and a list of blocks.
 * Drafts are saved with Save draft; Send test and Send save first. Once sent, it is read-only (Copy makes a new draft).
 * The server builds the email from the blocks, so nothing typed here can become HTML.
 */
type BlockType = NewsletterBlock['type'];
type Item = { key: number; block: NewsletterBlock };

const BLOCKS: { type: BlockType; label: string; icon: React.ElementType; make: () => NewsletterBlock }[] = [
  { type: 'heading', label: 'Heading', icon: Heading2, make: () => ({ type: 'heading', text: '' }) },
  { type: 'paragraph', label: 'Paragraph', icon: Pilcrow, make: () => ({ type: 'paragraph', text: '' }) },
  { type: 'image', label: 'Image', icon: ImageIcon, make: () => ({ type: 'image', src: '', alt: '', caption: '' }) },
  { type: 'button', label: 'Button', icon: MousePointerClick, make: () => ({ type: 'button', label: '', url: '' }) },
  { type: 'divider', label: 'Divider', icon: Minus, make: () => ({ type: 'divider' }) },
];
const blockMeta = (t: BlockType) => BLOCKS.find((b) => b.type === t)!;

let nextKey = 1;
const wrap = (block: NewsletterBlock): Item => ({ key: nextKey++, block });
const snapshot = (c: NewsletterContent) => JSON.stringify(c);

export const NewsletterEditor: React.FC = () => {
  const { id } = useParams();
  const nid = Number(id);
  const navigate = useNavigate();
  const [n, setN] = useState<Newsletter | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [preheader, setPreheader] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [saved, setSaved] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<null | 'save' | 'test' | 'send' | 'delete' | 'copy'>(null);
  const [confirm, setConfirm] = useState<null | 'send' | 'delete'>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  const content = (): NewsletterContent => ({ subject, preheader, coverImage: cover, blocks: items.map((i) => i.block) });
  const dirty = n?.status === 'draft' && snapshot(content()) !== saved;

  /** Take the server's copy; block keys are kept when the blocks are the same ones, so nothing loses focus. */
  const accept = (d: Newsletter) => {
    setN(d);
    setSubject(d.subject);
    setPreheader(d.preheader);
    setCover(d.coverImage);
    setItems((old) => (old.length === d.blocks.length ? d.blocks.map((block, i) => ({ key: old[i].key, block })) : d.blocks.map(wrap)));
    setSaved(snapshot({ subject: d.subject, preheader: d.preheader, coverImage: d.coverImage, blocks: d.blocks }));
  };

  useEffect(() => {
    let alive = true;
    newsletterAdminApi
      .get(nid)
      .then((d) => alive && accept(d))
      .catch((e) => alive && setLoadError(e instanceof ApiError ? e.message : 'Could not open the newsletter.'));
    return () => {
      alive = false;
    };
  }, [nid]);

  // While it is being sent, follow the progress.
  useEffect(() => {
    if (n?.status !== 'sending') return;
    const t = window.setInterval(() => newsletterAdminApi.get(nid).then(setN).catch(() => undefined), 20000);
    return () => window.clearInterval(t);
  }, [n?.status, nid]);

  // Closing the tab with unsaved changes asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  if (loadError) return <ErrorBox>{loadError}</ErrorBox>;
  if (!n) return <LoadingBlock />;

  const fail = (err: unknown, fallback: string) => {
    const { fields, message } = fieldErrors(err);
    setErrors(fields);
    const count = Object.keys(fields).length;
    setNotice({ tone: 'error', text: count ? `Please fix ${count === 1 ? 'the highlighted field' : `the ${count} highlighted fields`} first.` : message ?? fallback });
  };

  const save = async (): Promise<boolean> => {
    setErrors({});
    try {
      accept(await newsletterAdminApi.save(nid, content()));
      return true;
    } catch (err) {
      fail(err, 'Could not save the draft.');
      return false;
    }
  };

  const run = async (what: 'save' | 'test' | 'send', fn: () => Promise<void>) => {
    setBusy(what);
    setNotice(null);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const onSave = () =>
    run('save', async () => {
      if (await save()) setNotice({ tone: 'ok', text: 'Draft saved.' });
    });

  const onTest = () =>
    run('test', async () => {
      if (!(await save())) return;
      try {
        const { to } = await newsletterAdminApi.sendTest(nid);
        setNotice({ tone: 'ok', text: `Test sent to ${to}. Check that inbox (and its spam folder).` });
      } catch (err) {
        fail(err, 'Could not send the test.');
      }
    });

  const onSendClick = () =>
    run('send', async () => {
      if (await save()) {
        setConfirmError(null);
        setConfirm('send');
      }
    });

  const onSendConfirmed = async () => {
    setBusy('send');
    setConfirmError(null);
    try {
      accept(await newsletterAdminApi.send(nid));
      setConfirm(null);
      setNotice({ tone: 'ok', text: 'Sending has started. You can leave this page; it carries on by itself.' });
    } catch (err) {
      const { fields, message } = fieldErrors(err);
      if (Object.keys(fields).length) {
        setConfirm(null);
        fail(err, 'Could not send.');
      } else setConfirmError(message ?? 'Could not send the newsletter.');
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async () => {
    setBusy('delete');
    setConfirmError(null);
    try {
      await newsletterAdminApi.remove(nid);
      navigate('/admin/newsletter', { replace: true });
    } catch (err) {
      setConfirmError(err instanceof ApiError ? err.message : 'Could not delete the draft.');
      setBusy(null);
    }
  };

  const onCopy = async () => {
    setBusy('copy');
    setNotice(null);
    try {
      const copy = await newsletterAdminApi.copy(nid);
      navigate(`/admin/newsletter/${copy.id}`);
    } catch (err) {
      setNotice({ tone: 'error', text: err instanceof ApiError ? err.message : 'Could not copy the newsletter.' });
    } finally {
      setBusy(null);
    }
  };

  const setBlock = (key: number, block: NewsletterBlock) => setItems((list) => list.map((i) => (i.key === key ? { key, block } : i)));
  const move = (index: number, by: -1 | 1) =>
    setItems((list) => {
      const next = [...list];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  const remove = (key: number) => setItems((list) => list.filter((i) => i.key !== key));
  const add = (type: BlockType) => setItems((list) => [...list, wrap(blockMeta(type).make())]);

  const header = (
    <div className="space-y-3">
      <Link to="/admin/newsletter" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Newsletter
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-heading break-words min-w-0">
          {n.status === 'draft' ? (n.subject ? 'Edit newsletter' : 'New newsletter') : n.subject}
        </h1>
        {statusBadge(n)}
      </div>
    </div>
  );
  const noticeLine = notice && (
    <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`flex items-center gap-2 text-sm font-medium ${notice.tone === 'ok' ? 'text-teal-800' : 'text-rose-700'}`}>
      {notice.tone === 'ok' && <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />}
      {notice.text}
    </p>
  );

  // ------------------------------------------------------------ sent / sending: read-only
  if (n.status !== 'draft') {
    const done = n.sent + n.failed + n.skipped;
    const pct = n.recipients ? Math.round((done / n.recipients) * 100) : 100;
    // No finish time is promised: the hourly allowance is shared with other newsletters and retries.
    return (
      <div className="space-y-6">
        {header}
        <Panel title={n.status === 'sending' ? 'Sending' : 'Sent'}>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-slate-700">
                <span>
                  <strong className="text-slate-900">{n.sent}</strong> of {n.recipients} delivered
                </span>
                <span className="tabular-nums">{pct}%</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Sending progress">
                <div className="h-full rounded-full bg-teal-600 transition-[width]" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {[
                ['Sent', fmtWhen(n.queuedAt)],
                n.finishedAt ? ['Finished', fmtWhen(n.finishedAt)] : ['Still to send', String(n.pending)],
                ['Failed', String(n.failed)],
                ['Unsubscribed meanwhile', String(n.skipped)],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-50 px-3 py-2.5">
                  <dt className="text-xs text-slate-500">{k}</dt>
                  <dd className="font-semibold text-slate-900">{v}</dd>
                </div>
              ))}
            </dl>
            {n.status === 'sending' && (
              <p className="text-xs text-slate-500">
                The sender runs every 10 minutes and sends at most {n.sendRate} emails an hour (shared with any other newsletter being sent), so the mailbox stays
                under its sending limit and sign-up emails still get through. This page updates by itself.
              </p>
            )}
            {n.failed > 0 && <p className="text-xs text-slate-500">Failed addresses were tried three times; they are usually mistyped or closed mailboxes.</p>}
          </div>
        </Panel>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setPreviewing(true)} className={btn.secondary}>
            <Eye className="w-4 h-4" aria-hidden="true" /> View the email
          </button>
          <button onClick={onCopy} disabled={busy !== null} className={btn.secondary}>
            <Copy className="w-4 h-4" aria-hidden="true" /> {busy === 'copy' ? 'Copying…' : 'Copy to a new draft'}
          </button>
        </div>
        {noticeLine}
        {previewing && <PreviewModal content={content()} onClose={() => setPreviewing(false)} />}
      </div>
    );
  }

  // ------------------------------------------------------------ draft: editor
  return (
    <div className="space-y-6 pb-48 sm:pb-28">
      {header}

      <Panel title="Email details">
        <div className="space-y-4">
          <Input
            label="Subject"
            value={subject}
            maxLength={200}
            onChange={(e) => setSubject(e.target.value)}
            error={errors.subject}
            placeholder="e.g. New 60-Day program starts on 1 November"
          />
          <Input
            label="Preview text (optional)"
            value={preheader}
            maxLength={200}
            onChange={(e) => setPreheader(e.target.value)}
            error={errors.preheader}
            hint="Shown after the subject in the inbox, e.g. in Gmail. One short sentence that makes people open it."
          />
          <ImageField label="Cover image (optional)" value={cover} onChange={setCover} error={errors.coverImage} hint="Shown at the top, full width. A wide picture works best (about 1200 × 600)." />
        </div>
      </Panel>

      <Panel title="Content">
        <div className="space-y-4">
          {errors.blocks && <ErrorBox>{errors.blocks}</ErrorBox>}
          {items.length === 0 && <p className="text-sm text-slate-500">Add the first block below: usually a heading, then a paragraph.</p>}
          <ol className="space-y-3">
            {items.map((item, i) => (
              <BlockCard
                key={item.key}
                item={item}
                index={i}
                count={items.length}
                error={errors[`blocks.${i}`]}
                onChange={(b) => setBlock(item.key, b)}
                onMove={(by) => move(i, by)}
                onRemove={() => remove(item.key)}
              />
            ))}
          </ol>
          <div className="rounded-2xl border border-dashed border-slate-300 p-3">
            <p className="px-1 pb-2 text-xs font-semibold text-slate-500">Add a block</p>
            <div className="flex flex-wrap gap-2">
              {BLOCKS.map(({ type, label, icon: Icon }) => (
                <button key={type} type="button" onClick={() => add(type)} className={btn.secondary}>
                  <Icon className="w-4 h-4" aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      <div className="flex">
        <button type="button" onClick={() => setConfirm('delete')} className="text-sm font-semibold text-rose-700 hover:text-rose-800 cursor-pointer">
          Delete this draft
        </button>
      </div>

      {/* Actions stay in reach while writing a long newsletter. */}
      <div className="fixed bottom-0 inset-x-0 lg:left-64 z-20 border-t border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-3 flex flex-wrap items-center gap-2">
          <div className="flex-1 min-w-[10rem] text-sm">
            {noticeLine ?? (
              <span className={dirty ? 'font-medium text-amber-700' : 'text-slate-500'}>{dirty ? 'Unsaved changes' : `Saved ${fmtWhen(n.updatedAt)}`}</span>
            )}
          </div>
          <button type="button" onClick={onSave} disabled={busy !== null || !dirty} className={btn.secondary}>
            {busy === 'save' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Save draft
          </button>
          <button type="button" onClick={() => setPreviewing(true)} className={btn.secondary}>
            <Eye className="w-4 h-4" aria-hidden="true" /> Preview
          </button>
          <button type="button" onClick={onTest} disabled={busy !== null} className={btn.secondary}>
            {busy === 'test' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <MailCheck className="w-4 h-4" aria-hidden="true" />} Send me a test
          </button>
          <button type="button" onClick={onSendClick} disabled={busy !== null || n.subscribers === 0} className={btn.primary} title={n.subscribers === 0 ? 'Nobody is subscribed yet' : undefined}>
            <Send className="w-4 h-4" aria-hidden="true" /> Send to {n.subscribers} subscriber{n.subscribers === 1 ? '' : 's'}
          </button>
        </div>
      </div>

      {previewing && <PreviewModal content={content()} onClose={() => setPreviewing(false)} />}
      {confirm === 'send' && (
        <ConfirmDialog
          title="Send this newsletter?"
          message={
            <>
              <p>
                “{subject}” goes to <strong className="text-slate-900">{n.subscribers}</strong> subscriber{n.subscribers === 1 ? '' : 's'}.
                {` The sender runs every 10 minutes and sends at most ${n.sendRate} emails an hour`}
                {/* The first batch goes out at once, so the rest needs one more hour per full batch. */}
                {n.subscribers > n.sendRate ? `, so this takes more than ${Math.ceil(n.subscribers / n.sendRate) - 1} hour${Math.ceil(n.subscribers / n.sendRate) - 1 === 1 ? '' : 's'}.` : '.'}
              </p>
              <p>Once sent, it can't be stopped or changed. Sent yourself a test first?</p>
            </>
          }
          confirmLabel="Send now"
          busy={busy === 'send'}
          error={confirmError}
          onCancel={() => setConfirm(null)}
          onConfirm={onSendConfirmed}
        />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog
          title="Delete this draft?"
          message="The draft and its text are deleted. This can't be undone."
          confirmLabel="Delete draft"
          busy={busy === 'delete'}
          error={confirmError}
          onCancel={() => setConfirm(null)}
          onConfirm={onDelete}
        />
      )}
    </div>
  );
};

// ------------------------------------------------------------------ blocks

const BlockCard: React.FC<{
  item: Item;
  index: number;
  count: number;
  error?: string;
  onChange: (b: NewsletterBlock) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}> = ({ item, index, count, error, onChange, onMove, onRemove }) => {
  const { block } = item;
  const meta = blockMeta(block.type);
  const name = `${meta.label} ${index + 1}`;
  return (
    <li className={`rounded-2xl border p-4 ${error ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-slate-50/50'}`}>
      <div className="flex items-center gap-2">
        <meta.icon className="w-4 h-4 text-teal-700" aria-hidden="true" />
        <span className="text-sm font-semibold text-slate-800">{meta.label}</span>
        <div className="ml-auto flex">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} className={`${btn.icon} disabled:opacity-30`} aria-label={`Move ${name} up`}>
            <ArrowUp className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} className={`${btn.icon} disabled:opacity-30`} aria-label={`Move ${name} down`}>
            <ArrowDown className="w-4 h-4" />
          </button>
          <button type="button" onClick={onRemove} className={`${btn.icon} hover:text-rose-700`} aria-label={`Remove ${name}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
      {block.type !== 'divider' && (
        <div className="mt-3 space-y-3">
          {block.type === 'heading' && <Input label="Heading" value={block.text} maxLength={200} onChange={(e) => onChange({ ...block, text: e.target.value })} />}
          {block.type === 'paragraph' && <ParagraphField value={block.text} onChange={(text) => onChange({ ...block, text })} />}
          {block.type === 'image' && (
            <>
              <ImageField label="Image" value={block.src || null} onChange={(src) => onChange({ ...block, src: src ?? '' })} />
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Description (for screen readers)"
                  value={block.alt}
                  maxLength={200}
                  onChange={(e) => onChange({ ...block, alt: e.target.value })}
                  placeholder="e.g. Participants at the Kolkata workshop"
                />
                <Input label="Caption (optional)" value={block.caption} maxLength={300} onChange={(e) => onChange({ ...block, caption: e.target.value })} />
              </div>
            </>
          )}
          {block.type === 'button' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Button text" value={block.label} maxLength={60} onChange={(e) => onChange({ ...block, label: e.target.value })} placeholder="e.g. Register now" />
              <Input
                label="Link"
                type="url"
                inputMode="url"
                value={block.url}
                maxLength={500}
                onChange={(e) => onChange({ ...block, url: e.target.value })}
                placeholder="https://transenigma.com/…"
              />
            </div>
          )}
        </div>
      )}
    </li>
  );
};

/** A paragraph with Bold / Italic / Link buttons that wrap the selected text in the simple marks the server knows. */
const ParagraphField: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (before: string, after: string, placeholder: string, selectAfter?: string) => {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const chosen = value.slice(s, e) || placeholder;
    onChange(value.slice(0, s) + before + chosen + after + value.slice(e));
    requestAnimationFrame(() => {
      ta.focus();
      if (selectAfter) {
        // Select the "https://" of a new link, ready to paste over.
        const at = s + before.length + chosen.length + after.indexOf(selectAfter);
        ta.setSelectionRange(at, at + selectAfter.length);
      } else ta.setSelectionRange(s + before.length, s + before.length + chosen.length);
    });
  };
  const tool = 'inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 cursor-pointer focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/15';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1" role="toolbar" aria-label="Text formatting">
        <button type="button" className={tool} onClick={() => insert('**', '**', 'bold text')} aria-label="Bold" title="Bold">
          <Bold className="w-4 h-4" />
        </button>
        <button type="button" className={tool} onClick={() => insert('*', '*', 'italic text')} aria-label="Italic" title="Italic">
          <Italic className="w-4 h-4" />
        </button>
        <button type="button" className={tool} onClick={() => insert('[', '](https://)', 'link text', 'https://')} aria-label="Link" title="Link">
          <LinkIcon className="w-4 h-4" />
        </button>
      </div>
      <TextArea
        ref={ref}
        label="Text"
        rows={5}
        maxLength={5000}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        hint="Select words and use the buttons: **bold**, *italic*, [link text](https://…). Press Enter for a new line."
      />
    </div>
  );
};

/** Upload, show and remove one image (JPEG, PNG or GIF, up to 2 MB). */
const ImageField: React.FC<{ label: string; value: string | null; onChange: (v: string | null) => void; error?: string; hint?: string }> = ({
  label,
  value,
  onChange,
  error,
  hint,
}) => {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setProblem(null);
    if (file.size > 2 * 1024 * 1024) return setProblem('Please choose an image of at most 2 MB.');
    setUploading(true);
    try {
      onChange((await newsletterAdminApi.uploadImage(file)).path);
    } catch (err) {
      setProblem(err instanceof ApiError ? Object.values(err.fields)[0] ?? err.message : 'The upload failed.');
    } finally {
      setUploading(false);
      if (input.current) input.current.value = '';
    }
  };
  const message = problem ?? error;
  return (
    <div className="space-y-1.5">
      <p id={`${id}-label`} className="block text-sm font-medium text-slate-700">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {value && <img src={value} alt="" className="h-20 max-w-[12rem] rounded-xl border border-slate-200 object-cover bg-white" />}
        <input ref={input} id={id} type="file" accept="image/jpeg,image/png,image/gif" className="sr-only" aria-labelledby={`${id}-label`} onChange={(e) => upload(e.target.files?.[0])} />
        <button type="button" onClick={() => input.current?.click()} disabled={uploading} className={btn.secondary} aria-describedby={`${id}-label`}>
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Upload className="w-4 h-4" aria-hidden="true" />}
          {uploading ? 'Uploading…' : value ? 'Replace' : 'Choose image'}
        </button>
        {value && !uploading && (
          <button type="button" onClick={() => onChange(null)} className="text-sm font-semibold text-slate-600 hover:text-rose-700 cursor-pointer">
            Remove
          </button>
        )}
      </div>
      {message ? <p className="text-xs text-rose-600">{message}</p> : <p className="text-xs text-slate-500">{hint ?? 'JPEG, PNG or GIF, up to 2 MB.'}</p>}
    </div>
  );
};

// ------------------------------------------------------------------ preview

/** The email as the server builds it, in a sandboxed frame (no scripts), at desktop or phone width. */
const PreviewModal: React.FC<{ content: NewsletterContent; onClose: () => void }> = ({ content, onClose }) => {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState<'desktop' | 'phone'>('desktop');
  const [height, setHeight] = useState(600);
  const frame = useRef<HTMLIFrameElement>(null);
  const [input] = useState(content); // what was on screen when Preview was pressed

  useEffect(() => {
    newsletterAdminApi
      .preview(input)
      .then((r) => setHtml(r.html.replace('<head>', '<head><base target="_blank">')))
      .catch((err) => {
        const { fields, message } = fieldErrors(err);
        setError(Object.values(fields)[0] ?? message ?? 'Could not build the preview.');
      });
  }, [input]);

  const fit = () => {
    const doc = frame.current?.contentDocument;
    if (doc) setHeight(doc.documentElement.scrollHeight + 4);
  };
  // A narrower frame makes the email taller.
  useEffect(() => {
    const t = window.setTimeout(fit, 50);
    return () => window.clearTimeout(t);
  }, [width]);

  return (
    <Modal title="Preview" onClose={onClose} wide>
      <div className="space-y-3">
        {input.subject && (
          <p className="text-sm text-slate-700">
            <span className="text-slate-500">Subject:</span> <strong className="text-slate-900">{input.subject}</strong>
            {input.preheader && <span className="text-slate-500"> · {input.preheader}</span>}
          </p>
        )}
        <div className="flex gap-1" role="group" aria-label="Preview width">
          {(
            [
              ['desktop', 'Desktop', Monitor],
              ['phone', 'Phone', Smartphone],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={width === value}
              onClick={() => setWidth(value)}
              className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-semibold cursor-pointer ${width === value ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Icon className="w-4 h-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        {error && <ErrorBox>{error}</ErrorBox>}
        {!html && !error && <LoadingBlock label="Building the preview…" />}
        {html && (
          <div className="rounded-2xl bg-slate-100 p-2 overflow-x-auto">
            <iframe
              ref={frame}
              title="Email preview"
              srcDoc={html}
              onLoad={fit}
              // Our own server-built HTML; same-origin only so the frame's height can be read. No scripts run.
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              className="block mx-auto bg-white rounded-xl border-0"
              style={{ width: width === 'desktop' ? 600 : 375, maxWidth: '100%', height }}
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
