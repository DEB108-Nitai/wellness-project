import React, { useCallback, useEffect, useId, useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { AdminFaq, siteAdminApi } from '../../api/admin';
import { ApiError } from '../../api/client';
import { Badge, btn, ConfirmDialog, EmptyState, ErrorBox, fieldErrors, Input, LoadingBlock, Modal, PageHeader, TextArea, Toggle } from './ui';

/** FAQs on /faq (PRD ADM-7): add, edit, reorder, hide, delete. The FAQ page's category filters follow the categories used here. */
export const FaqsAdmin: React.FC = () => {
  const [faqs, setFaqs] = useState<AdminFaq[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminFaq | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminFaq | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);

  const load = useCallback(() => {
    setError(null);
    siteAdminApi
      .faqs()
      .then(setFaqs)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load the FAQs.'));
  }, []);
  useEffect(load, [load]);

  const move = async (i: number, dir: -1 | 1) => {
    if (!faqs || !faqs[i + dir] || ordering) return;
    const order = [...faqs];
    [order[i], order[i + dir]] = [order[i + dir], order[i]];
    setFaqs(order); // show the move at once; the server answer replaces it
    setNotice(null);
    setOrdering(true);
    try {
      setFaqs(await siteAdminApi.reorderFaqs(order.map((f) => f.id)));
      setNotice('Order saved. The FAQ page shows them in this order.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the new order.');
      load();
    } finally {
      setOrdering(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setDeleteError(null);
    try {
      await siteAdminApi.deleteFaq(deleting.id);
      setDeleting(null);
      setNotice('FAQ deleted.');
      load();
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : 'Could not delete the FAQ.');
    } finally {
      setBusy(false);
    }
  };

  const categories = [...new Set((faqs ?? []).map((f) => f.category))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="FAQs"
        description={
          faqs ? (
            <>
              <strong className="text-slate-800">{faqs.filter((f) => f.published).length}</strong> published questions on the FAQ page, in this order. Hidden ones stay
              here.
            </>
          ) : undefined
        }
        actions={
          <button onClick={() => setEditing('new')} className={btn.primary} disabled={!faqs}>
            <Plus className="w-4 h-4" aria-hidden="true" /> Add FAQ
          </button>
        }
      />
      {notice && (
        <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-900">
          {notice}
        </p>
      )}
      {error && <ErrorBox onRetry={load}>{error}</ErrorBox>}
      {!faqs && !error && <LoadingBlock />}
      {faqs && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" aria-label="FAQs">
          {faqs.length === 0 ? (
            <EmptyState title="No FAQs yet.">Add the first one; it appears on the FAQ page straight away.</EmptyState>
          ) : (
            <ol className="divide-y divide-slate-100">
              {faqs.map((f, i) => (
                <li key={f.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="flex flex-col shrink-0">
                    <button onClick={() => move(i, -1)} disabled={i === 0 || ordering} className={`${btn.icon} w-8 h-8 disabled:opacity-30`} aria-label={`Move “${f.question}” up`}>
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => move(i, 1)} disabled={i === faqs.length - 1 || ordering} className={`${btn.icon} w-8 h-8 disabled:opacity-30`} aria-label={`Move “${f.question}” down`}>
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{f.category}</Badge>
                      {!f.published && <Badge tone="amber">Hidden</Badge>}
                    </div>
                    <p className="mt-1.5 text-sm font-semibold text-slate-900">{f.question}</p>
                    <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{f.answer}</p>
                  </div>
                  <div className="flex shrink-0">
                    <button onClick={() => setEditing(f)} className={btn.icon} aria-label={`Edit “${f.question}”`}>
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleting(f)} className={btn.icon} aria-label={`Delete “${f.question}”`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {editing && (
        <FaqForm
          faq={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null);
            setNotice(m);
            load();
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this FAQ?"
          message={<p>“{deleting.question}” is removed from the FAQ page. To keep it but not show it, edit it and turn off Published instead.</p>}
          confirmLabel="Delete FAQ"
          busy={busy}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleting(null);
            setDeleteError(null);
          }}
        />
      )}
    </div>
  );
};

const FaqForm: React.FC<{ faq: AdminFaq | null; categories: string[]; onClose: () => void; onSaved: (message: string) => void }> = ({ faq, categories, onClose, onSaved }) => {
  const listId = useId();
  const [category, setCategory] = useState(faq?.category ?? categories[0] ?? '');
  const [question, setQuestion] = useState(faq?.question ?? '');
  const [answer, setAnswer] = useState(faq?.answer ?? '');
  const [published, setPublished] = useState(faq?.published ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (category.trim().length < 2) local.category = 'Choose a category or type a new one.';
    if (question.trim().length < 5) local.question = 'Please write the question.';
    if (answer.trim().length < 5) local.answer = 'Please write the answer.';
    if (Object.keys(local).length) return setErrors(local);
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      // "assessment" and "Assessment" would be two filter buttons on the FAQ page: reuse the existing spelling.
      const typed = category.trim();
      const cat = categories.find((c) => c.toLowerCase() === typed.toLowerCase()) ?? typed;
      const body = { category: cat, question: question.trim(), answer: answer.trim(), published };
      if (faq) await siteAdminApi.updateFaq(faq.id, body);
      else await siteAdminApi.createFaq(body);
      onSaved(faq ? 'FAQ saved.' : published ? 'FAQ added at the end of the FAQ page.' : 'FAQ added (hidden).');
    } catch (err) {
      const f = fieldErrors(err);
      setErrors(f.fields);
      setMessage(f.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={faq ? 'Edit FAQ' : 'Add an FAQ'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>
            Cancel
          </button>
          <button type="submit" form="faq-form" disabled={saving} className={btn.primary}>
            {saving ? 'Saving…' : faq ? 'Save FAQ' : 'Add FAQ'}
          </button>
        </>
      }
    >
      <form id="faq-form" onSubmit={save} className="space-y-4" noValidate>
        <Input
          label="Category"
          list={listId}
          value={category}
          maxLength={40}
          onChange={(e) => setCategory(e.target.value)}
          error={errors.category}
          hint="Pick one from the list or type a new one. Each category is a filter button on the FAQ page."
        />
        <datalist id={listId}>
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Input label="Question" value={question} maxLength={255} onChange={(e) => setQuestion(e.target.value)} error={errors.question} />
        <TextArea label="Answer" rows={6} maxLength={5000} value={answer} onChange={(e) => setAnswer(e.target.value)} error={errors.answer} />
        <Toggle label="Published" checked={published} onChange={setPublished} hint="Hidden FAQs stay here but are not shown on the site." />
        {message && <ErrorBox>{message}</ErrorBox>}
      </form>
    </Modal>
  );
};
