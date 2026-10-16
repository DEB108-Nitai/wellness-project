import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { AdminCategory, AdminPaper, contentAdminApi, PaperInput } from '../../api/admin';
import { ApiError } from '../../api/client';
import { invalidateContentStats } from '../../hooks/useContentStats';
import { Badge, btn, ConfirmDialog, EmptyState, ErrorBox, fieldErrors, Input, LoadingBlock, Modal, PageHeader, Select, TextArea, Toggle } from './ui';

/**
 * Research papers and their categories (fields). Everything here shows on /research, and the counts and
 * home-page cards follow automatically: a new category becomes a new sliding card on the home page.
 */
type Data = { categories: AdminCategory[]; papers: AdminPaper[] };
const NEW = 'new';
const papersLabel = (n: number) => `${n} paper${n === 1 ? '' : 's'}`;

export const ResearchAdmin: React.FC = () => {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'papers' | 'categories'>('papers');
  const [q, setQ] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editing, setEditing] = useState<AdminPaper | 'new' | null>(null);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | 'new' | null>(null);
  const [deleting, setDeleting] = useState<{ kind: 'paper'; item: AdminPaper } | { kind: 'category'; item: AdminCategory } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    contentAdminApi
      .research()
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load the research content.'));
  }, []);
  useEffect(load, [load]);

  const changed = (message: string) => {
    invalidateContentStats();
    setNotice(message);
    load();
  };

  const groups = useMemo(() => {
    if (!data) return [];
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return data.categories
      .filter((c) => !categoryFilter || String(c.id) === categoryFilter)
      .map((c) => ({
        category: c,
        papers: data.papers.filter(
          (p) => p.categoryId === c.id && words.every((w) => p.citation.toLowerCase().includes(w) || String(p.year ?? '').includes(w)),
        ),
      }))
      .filter((g) => g.papers.length > 0 || (!q && categoryFilter !== ''));
  }, [data, q, categoryFilter]);

  const publishedPapers = data?.papers.filter((p) => p.published && data.categories.find((c) => c.id === p.categoryId)?.published).length ?? 0;

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setDeleteError(null);
    try {
      if (deleting.kind === 'paper') await contentAdminApi.deletePaper(deleting.item.id);
      else await contentAdminApi.deleteCategory(deleting.item.id);
      setDeleting(null);
      changed(deleting.kind === 'paper' ? 'Paper deleted.' : 'Category deleted.');
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : 'Could not delete.');
    } finally {
      setBusy(false);
    }
  };

  const move = async (c: AdminCategory, dir: -1 | 1) => {
    if (!data) return;
    const list = data.categories;
    const i = list.findIndex((x) => x.id === c.id);
    const other = list[i + dir];
    if (!other) return;
    // Swap positions; equal sort orders get distinct ones first.
    // Renumber the whole list 1..n in the new order, so equal or missing positions can't block a move.
    const order = [...list];
    [order[i], order[i + dir]] = [order[i + dir], order[i]];
    setNotice(null);
    try {
      await Promise.all(order.map((x, n) => (x.sortOrder !== n + 1 ? contentAdminApi.updateCategory(x.id, { sortOrder: n + 1 }) : null)));
      changed('Order saved. The home page cards follow this order.');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the new order.');
      load();
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Research papers"
        description={
          data ? (
            <>
              <strong className="text-slate-800">{publishedPapers}</strong> published papers in{' '}
              <strong className="text-slate-800">{data.categories.filter((c) => c.published && c.paperCount > 0).length}</strong> fields. Changes appear on the
              Research page and the home page straight away.
            </>
          ) : undefined
        }
        actions={
          <>
            <button onClick={() => setEditingCategory('new')} className={btn.secondary}>
              <Plus className="w-4 h-4" aria-hidden="true" /> New category
            </button>
            <button onClick={() => setEditing('new')} className={btn.primary} disabled={!data}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Add paper
            </button>
          </>
        }
      />

      {notice && (
        <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-900">
          {notice}
        </p>
      )}
      {error && <ErrorBox onRetry={load}>{error}</ErrorBox>}

      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {(['papers', 'categories'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-11 px-4 text-sm font-semibold border-b-2 -mb-px cursor-pointer ${tab === t ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t === 'papers' ? 'Papers' : 'Categories'}
          </button>
        ))}
      </div>

      {!data && !error && <LoadingBlock />}

      {data && tab === 'papers' && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="relative flex-1">
              <span className="sr-only">Search papers</span>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title, author, journal or year"
                className="w-full h-11 pl-10 pr-3 rounded-xl border border-slate-300 bg-white text-[15px] focus:outline-hidden focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500"
              />
            </label>
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-11 px-3 rounded-xl border border-slate-300 bg-white text-sm sm:max-w-xs"
            >
              <option value="">All categories</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.paperCount})
                </option>
              ))}
            </select>
          </div>

          {groups.length === 0 ? (
            <EmptyState title="No papers match.">Try another search or category.</EmptyState>
          ) : (
            <div className="space-y-5">
              {groups.map(({ category, papers }) => (
                <section key={category.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" aria-label={category.name}>
                  <header className="flex flex-wrap items-center gap-2 px-5 py-3 bg-slate-50 border-b border-slate-200">
                    <h2 className="text-sm font-bold text-slate-900">{category.name}</h2>
                    <Badge>{papersLabel(category.paperCount)}</Badge>
                    {!category.published && <Badge tone="amber">Hidden category</Badge>}
                  </header>
                  {papers.length === 0 ? (
                    <EmptyState title="No papers in this category yet." />
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {papers.map((p) => (
                        <li key={p.id} className="flex items-start gap-3 px-5 py-3">
                          <span className="mt-0.5 w-12 shrink-0 text-xs font-bold text-slate-500 tabular-nums">{p.year ?? 'n.d.'}</span>
                          <div className="flex-1 min-w-0 space-y-1">
                            <p className={`text-sm leading-relaxed ${p.published ? 'text-slate-800' : 'text-slate-400'}`}>{p.citation}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              {!p.published && <Badge tone="amber">Hidden</Badge>}
                              {p.url && (
                                <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                                  Link <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="flex shrink-0">
                            <button onClick={() => setEditing(p)} className={btn.icon} aria-label="Edit paper">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleting({ kind: 'paper', item: p })} className={btn.icon} aria-label="Delete paper">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {data && tab === 'categories' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <p className="px-5 py-3 text-xs text-slate-500 border-b border-slate-100">
            Each published category with papers is a card on the home page, in this order. A category can be deleted only when it has no papers.
          </p>
          <ul className="divide-y divide-slate-100">
            {data.categories.map((c, i) => (
              <li key={c.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-5 py-3">
                <div className="flex flex-col">
                  <button onClick={() => move(c, -1)} disabled={i === 0} className={`${btn.icon} w-11 h-11 disabled:opacity-30`} aria-label={`Move ${c.name} up`}>
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => move(c, 1)} disabled={i === data.categories.length - 1} className={`${btn.icon} w-11 h-11 disabled:opacity-30`} aria-label={`Move ${c.name} down`}>
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {c.name} {!c.published && <Badge tone="amber">Hidden</Badge>}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{c.tagline || 'No tagline (the home page card shows only the name)'}</p>
                </div>
                <Badge>{papersLabel(c.paperCount)}</Badge>
                <div className="flex shrink-0">
                  <button onClick={() => setEditingCategory(c)} className={btn.icon} aria-label={`Edit ${c.name}`}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleting({ kind: 'category', item: c })}
                    disabled={c.paperCount > 0}
                    title={c.paperCount > 0 ? 'Move or delete its papers first' : undefined}
                    className={`${btn.icon} disabled:opacity-30 disabled:cursor-not-allowed`}
                    aria-label={`Delete ${c.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {editing && data && (
        <PaperForm
          paper={editing === 'new' ? null : editing}
          categories={data.categories}
          defaultCategoryId={categoryFilter ? Number(categoryFilter) : undefined}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            changed(msg);
          }}
        />
      )}
      {editingCategory && (
        <CategoryForm
          category={editingCategory === 'new' ? null : editingCategory}
          onClose={() => setEditingCategory(null)}
          onSaved={(msg) => {
            setEditingCategory(null);
            changed(msg);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={deleting.kind === 'paper' ? 'Delete this paper?' : `Delete “${deleting.item.name}”?`}
          message={
            deleting.kind === 'paper' ? (
              <p className="line-clamp-4">“{deleting.item.citation}”</p>
            ) : (
              <p>The category and its home page card are removed. This can't be undone.</p>
            )
          }
          confirmLabel="Delete"
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

const PaperForm: React.FC<{
  paper: AdminPaper | null;
  categories: AdminCategory[];
  defaultCategoryId?: number;
  onClose: () => void;
  onSaved: (message: string) => void;
}> = ({ paper, categories, defaultCategoryId, onClose, onSaved }) => {
  const [citation, setCitation] = useState(paper?.citation ?? '');
  const [category, setCategory] = useState(paper ? String(paper.categoryId) : defaultCategoryId ? String(defaultCategoryId) : '');
  const [newName, setNewName] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [year, setYear] = useState(paper?.year ? String(paper.year) : String(new Date().getFullYear()));
  const [url, setUrl] = useState(paper?.url ?? '');
  const [published, setPublished] = useState(paper?.published ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (citation.trim().length < 5) local.citation = 'Please enter the title or full citation.';
    if (!category) local.categoryId = 'Please choose a category or create a new one.';
    if (category === NEW && newName.trim().length < 2) local.name = 'Please name the new category.';
    if (Object.keys(local).length) return setErrors(local);

    const input: PaperInput = {
      citation: citation.trim(),
      year: year.trim() ? Number(year) : null,
      url: url.trim() || null,
      published,
      ...(category === NEW ? { newCategory: { name: newName.trim(), tagline: newTagline.trim() || null } } : { categoryId: Number(category) }),
    };
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      if (paper) await contentAdminApi.updatePaper(paper.id, input);
      else await contentAdminApi.createPaper(input);
      onSaved(paper ? 'Paper saved.' : category === NEW ? `Paper added in the new category “${newName.trim()}”. It now has its own card on the home page.` : 'Paper added.');
    } catch (err) {
      const { fields, message: m } = fieldErrors(err);
      // The new category's own fields come back under "name"/"newCategory".
      setErrors(fields);
      setMessage(m);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={paper ? 'Edit paper' : 'Add a research paper'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>
            Cancel
          </button>
          <button type="submit" form="paper-form" disabled={saving} className={btn.primary}>
            {saving ? 'Saving…' : paper ? 'Save paper' : 'Add paper'}
          </button>
        </>
      }
    >
      <form id="paper-form" onSubmit={save} className="space-y-4" noValidate>
        <TextArea
          label="Title or full citation"
          rows={4}
          maxLength={2000}
          value={citation}
          onChange={(e) => setCitation(e.target.value)}
          error={errors.citation}
          hint="Shown exactly as typed on the Research page, e.g. “Bhasin, M. and Das, V., 2025. Title. Journal, 12(3), pp. 1–20.”"
        />
        <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)} error={errors.categoryId}>
          <option value="">Choose a category…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          {!paper && <option value={NEW}>+ New category…</option>}
        </Select>
        {category === NEW && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 space-y-3">
            <Input label="New category name" value={newName} maxLength={160} onChange={(e) => setNewName(e.target.value)} error={errors.name ?? errors.newCategory} />
            <Input
              label="Tagline (optional)"
              value={newTagline}
              maxLength={255}
              onChange={(e) => setNewTagline(e.target.value)}
              error={errors.tagline}
              hint="One line under the category name on its home page card."
            />
          </div>
        )}
        <div className="grid sm:grid-cols-[10rem_1fr] gap-4">
          <Input label="Year" type="number" inputMode="numeric" min={1900} max={new Date().getFullYear() + 1} value={year} onChange={(e) => setYear(e.target.value)} error={errors.year} hint="Leave empty if unknown." />
          <Input label="Link to the paper (optional)" type="url" placeholder="https://…" value={url} maxLength={500} onChange={(e) => setUrl(e.target.value)} error={errors.url} />
        </div>
        <Toggle label="Published" checked={published} onChange={setPublished} hint="Hidden papers stay here but are not shown or counted on the site." />
        {message && <ErrorBox>{message}</ErrorBox>}
      </form>
    </Modal>
  );
};

const CategoryForm: React.FC<{ category: AdminCategory | null; onClose: () => void; onSaved: (message: string) => void }> = ({ category, onClose, onSaved }) => {
  const [name, setName] = useState(category?.name ?? '');
  const [tagline, setTagline] = useState(category?.tagline ?? '');
  const [published, setPublished] = useState(category?.published ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setErrors({ name: 'Please enter a name.' });
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      const body = { name: name.trim(), tagline: tagline.trim() || null, published };
      if (category) await contentAdminApi.updateCategory(category.id, body);
      else await contentAdminApi.createCategory(body);
      onSaved(category ? 'Category saved.' : 'Category created. It appears on the site once it has a paper.');
    } catch (err) {
      const { fields, message: m } = fieldErrors(err);
      setErrors(fields);
      setMessage(m);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={category ? 'Edit category' : 'New research category'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>
            Cancel
          </button>
          <button type="submit" form="category-form" disabled={saving} className={btn.primary}>
            {saving ? 'Saving…' : 'Save category'}
          </button>
        </>
      }
    >
      <form id="category-form" onSubmit={save} className="space-y-4" noValidate>
        <Input label="Name" value={name} maxLength={160} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Input label="Tagline (optional)" value={tagline} maxLength={255} onChange={(e) => setTagline(e.target.value)} error={errors.tagline} hint="One line on the home page card." />
        <Toggle label="Published" checked={published} onChange={setPublished} hint="A hidden category and its papers are not shown or counted on the site." />
        {category && <p className="text-xs text-slate-500">Link on the site: /research#{category.slug} (it never changes, so shared links keep working).</p>}
        {message && <ErrorBox>{message}</ErrorBox>}
      </form>
    </Modal>
  );
};
