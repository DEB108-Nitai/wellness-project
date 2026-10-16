import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ExternalLink, ImagePlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { AdminProject, AdminProjectGroup, contentAdminApi, GroupKind, ProjectGroup, ProjectInput } from '../../api/admin';
import { ApiError } from '../../api/client';
import { invalidateContentStats } from '../../hooks/useContentStats';
import { Badge, btn, ConfirmDialog, EmptyState, ErrorBox, fieldErrors, Input, LoadingBlock, Modal, PageHeader, Select, TextArea, Toggle } from './ui';

/**
 * Consultancy projects on /consultancy, by category. Categories are managed here too (owner request): each is
 * either client work (counted on the home page; client names fill "Clients and partners") or our own products
 * in development (marked "In development", not counted).
 */
type Data = { groups: AdminProjectGroup[]; projects: AdminProject[] };
const NEW = '__new';

const KIND_OPTIONS: { value: GroupKind; label: string }[] = [
  { value: 'clients', label: 'Client work: counted on the home page, client names listed' },
  { value: 'products', label: 'Our products in development: marked “In development”, not counted' },
];
const projectsLabel = (n: number) => `${n} ${n === 1 ? 'project' : 'projects'}`;

export const ConsultancyAdmin: React.FC = () => {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'projects' | 'categories'>('projects');
  const [editing, setEditing] = useState<AdminProject | { group: ProjectGroup } | null>(null);
  const [editingGroup, setEditingGroup] = useState<AdminProjectGroup | 'new' | null>(null);
  const [deleting, setDeleting] = useState<{ kind: 'project'; item: AdminProject } | { kind: 'group'; item: AdminProjectGroup } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    contentAdminApi
      .consultancy()
      .then(setData)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load the projects.'));
  }, []);
  useEffect(load, [load]);

  const changed = (message: string) => {
    invalidateContentStats();
    setNotice(message);
    load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setDeleteError(null);
    try {
      if (deleting.kind === 'project') await contentAdminApi.deleteProject(deleting.item.id);
      else await contentAdminApi.deleteGroup(deleting.item.id);
      setDeleting(null);
      changed(deleting.kind === 'project' ? 'Project removed.' : 'Category deleted.');
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : 'Could not delete.');
    } finally {
      setBusy(false);
    }
  };

  const move = async (g: AdminProjectGroup, dir: -1 | 1) => {
    if (!data) return;
    const i = data.groups.findIndex((x) => x.id === g.id);
    if (!data.groups[i + dir]) return;
    // Renumber the whole list 1..n in the new order, so equal or missing positions can't block a move.
    const order = [...data.groups];
    [order[i], order[i + dir]] = [order[i + dir], order[i]];
    setNotice(null);
    try {
      await Promise.all(order.map((x, n) => (x.sortOrder !== n + 1 ? contentAdminApi.updateGroup(x.id, { sortOrder: n + 1 }) : null)));
      changed('Order saved. The Consultancy page follows this order (client work first, then products in development).');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the new order.');
      load();
    }
  };

  const clientSlugs = new Set(data?.groups.filter((g) => g.kind === 'clients').map((g) => g.slug));
  const clientProjects = data?.projects.filter((p) => p.published && clientSlugs.has(p.group)).length ?? 0;
  const firstClientGroup = data?.groups.find((g) => g.kind === 'clients')?.slug ?? data?.groups[0]?.slug ?? NEW;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultancy projects"
        description={
          data ? (
            <>
              <strong className="text-slate-800">{clientProjects}</strong> published client projects (the number on the home page). Products in development are
              shown separately and not counted.
            </>
          ) : undefined
        }
        actions={
          <>
            <button onClick={() => setEditingGroup('new')} className={btn.secondary} disabled={!data}>
              <Plus className="w-4 h-4" aria-hidden="true" /> New category
            </button>
            <button onClick={() => setEditing({ group: firstClientGroup })} className={btn.primary} disabled={!data}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Add project
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
        {(['projects', 'categories'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-11 px-4 text-sm font-semibold border-b-2 -mb-px cursor-pointer ${tab === t ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t === 'projects' ? 'Projects' : 'Categories'}
          </button>
        ))}
      </div>

      {!data && !error && <LoadingBlock />}

      {data &&
        tab === 'projects' &&
        data.groups.map((g) => {
          const projects = data.projects.filter((p) => p.group === g.slug);
          return (
            <section key={g.slug} aria-label={g.name} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900">
                  {g.name} <span className="text-slate-400 font-medium">({projects.length})</span>
                  {g.kind === 'products' && (
                    <span className="ml-2 align-middle">
                      <Badge tone="indigo">In development</Badge>
                    </span>
                  )}
                </h2>
                <button onClick={() => setEditing({ group: g.slug })} className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800 cursor-pointer">
                  <Plus className="w-4 h-4" aria-hidden="true" /> Add here
                </button>
              </div>
              {projects.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300">
                  <EmptyState title="No projects in this category.">The category is hidden on the site until it has one.</EmptyState>
                </div>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {projects.map((p) => (
                    <li key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                      <div className="aspect-[16/9] bg-slate-50 border-b border-slate-100 flex items-center justify-center">
                        {p.image ? <img src={p.image} alt="" className="w-full h-full object-contain" loading="lazy" /> : <span className="text-xs text-slate-400">No image</span>}
                      </div>
                      <div className="p-4 flex-1 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                            {p.clientName && <p className="text-xs text-slate-500">Client: {p.clientName}</p>}
                          </div>
                          {!p.published && <Badge tone="amber">Hidden</Badge>}
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-3">{p.description}</p>
                        <div className="mt-auto flex items-center justify-between pt-2">
                          {p.url ? (
                            <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                              Website <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">No website</span>
                          )}
                          <div className="flex">
                            <button onClick={() => setEditing(p)} className={btn.icon} aria-label={`Edit ${p.name}`}>
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleting({ kind: 'project', item: p })} className={btn.icon} aria-label={`Remove ${p.name}`}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

      {data && tab === 'categories' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <p className="px-5 py-3 text-xs text-slate-500 border-b border-slate-100">
            Each category with a published project is a section on the Consultancy page, in this order (client work first). A category can be deleted only when it has
            no projects.
          </p>
          <ul className="divide-y divide-slate-100">
            {data.groups.map((g, i) => (
              <li key={g.id} className="flex flex-wrap sm:flex-nowrap items-center gap-3 px-5 py-3">
                <div className="flex flex-col">
                  <button onClick={() => move(g, -1)} disabled={i === 0} className={`${btn.icon} w-11 h-11 disabled:opacity-30`} aria-label={`Move ${g.name} up`}>
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => move(g, 1)} disabled={i === data.groups.length - 1} className={`${btn.icon} w-11 h-11 disabled:opacity-30`} aria-label={`Move ${g.name} down`}>
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{g.name}</p>
                  <p className="text-xs text-slate-500 truncate">{g.tagline || 'No tagline'}</p>
                </div>
                <Badge tone={g.kind === 'products' ? 'indigo' : 'teal'}>{g.kind === 'products' ? 'In development' : 'Client work'}</Badge>
                <Badge>{projectsLabel(g.projectCount)}</Badge>
                <div className="flex shrink-0">
                  <button onClick={() => setEditingGroup(g)} className={btn.icon} aria-label={`Edit ${g.name}`}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleting({ kind: 'group', item: g })}
                    disabled={g.projectCount > 0}
                    title={g.projectCount > 0 ? 'Move or remove its projects first' : undefined}
                    className={`${btn.icon} disabled:opacity-30 disabled:cursor-not-allowed`}
                    aria-label={`Delete ${g.name}`}
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
        <ProjectForm
          project={'id' in editing ? editing : null}
          defaultGroup={editing.group}
          groups={data.groups}
          onClose={() => setEditing(null)}
          onSaved={(m) => {
            setEditing(null);
            changed(m);
          }}
        />
      )}
      {editingGroup && (
        <GroupForm
          group={editingGroup === 'new' ? null : editingGroup}
          onClose={() => setEditingGroup(null)}
          onSaved={(m) => {
            setEditingGroup(null);
            changed(m);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={`${deleting.kind === 'project' ? 'Remove' : 'Delete'} “${deleting.item.name}”?`}
          message={
            deleting.kind === 'project' ? (
              <p>
                It disappears from the Consultancy page{clientSlugs.has(deleting.item.group) ? ' and the client project count' : ''}. This can't be undone.
              </p>
            ) : (
              <p>The empty category is removed. This can't be undone.</p>
            )
          }
          confirmLabel={deleting.kind === 'project' ? 'Remove project' : 'Delete category'}
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

/** Name, tagline and kind of a new category: shared by the category form and "+ New category…" in the project form. */
const GroupFields: React.FC<{
  name: string;
  tagline: string;
  kind: GroupKind;
  onName: (v: string) => void;
  onTagline: (v: string) => void;
  onKind: (v: GroupKind) => void;
  errors: Record<string, string>;
  nameLabel?: string;
}> = ({ name, tagline, kind, onName, onTagline, onKind, errors, nameLabel = 'Name' }) => (
  <>
    <Input label={nameLabel} value={name} maxLength={160} onChange={(e) => onName(e.target.value)} error={errors.name ?? errors.newGroup} />
    <Input label="Tagline (optional)" value={tagline} maxLength={255} onChange={(e) => onTagline(e.target.value)} error={errors.tagline} hint="One line under the category name on the Consultancy page." />
    <Select label="Type" value={kind} onChange={(e) => onKind(e.target.value as GroupKind)} error={errors.kind}>
      {KIND_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  </>
);

const ProjectForm: React.FC<{
  project: AdminProject | null;
  defaultGroup: ProjectGroup;
  groups: AdminProjectGroup[];
  onClose: () => void;
  onSaved: (message: string) => void;
}> = ({ project, defaultGroup, groups, onClose, onSaved }) => {
  const [group, setGroup] = useState<ProjectGroup>(project?.group ?? defaultGroup);
  const [newName, setNewName] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newKind, setNewKind] = useState<GroupKind>('clients');
  const [name, setName] = useState(project?.name ?? '');
  const [clientName, setClientName] = useState(project?.clientName ?? '');
  const [description, setDescription] = useState(project?.description ?? '');
  const [url, setUrl] = useState(project?.url ?? '');
  const [image, setImage] = useState<string | null>(project?.image ?? null);
  const [published, setPublished] = useState(project?.published ?? true);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const isNew = group === NEW;
  const products = isNew ? newKind === 'products' : groups.find((g) => g.slug === group)?.kind === 'products';

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return setErrors((e) => ({ ...e, image: 'Please choose an image of at most 2 MB.' }));
    setUploading(true);
    setErrors((e) => ({ ...e, image: '' }));
    try {
      setImage((await contentAdminApi.uploadProjectImage(file)).path);
    } catch (err) {
      setErrors((e) => ({ ...e, image: err instanceof ApiError ? Object.values(err.fields)[0] ?? err.message : 'The upload failed.' }));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (isNew && newName.trim().length < 2) local.newGroup = 'Please name the new category.';
    if (name.trim().length < 2) local.projectName = 'Please enter the project name.';
    if (description.trim().length < 10) local.description = 'Please describe the project in a sentence or two.';
    if (Object.keys(local).length) return setErrors(local);

    const input: ProjectInput = {
      ...(isNew ? { newGroup: { name: newName.trim(), tagline: newTagline.trim() || null, kind: newKind } } : { group }),
      name: name.trim(),
      description: description.trim(),
      url: url.trim() || null,
      image,
      published,
      // Hidden for products in development: left out, so a client name saved earlier is kept, not erased.
      ...(products ? {} : { clientName: clientName.trim() || null }),
    };
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      if (project) await contentAdminApi.updateProject(project.id, input);
      else await contentAdminApi.createProject(input);
      onSaved(project ? 'Project saved.' : isNew ? `Project added in the new category “${newName.trim()}”, now a section on the Consultancy page.` : 'Project added to the Consultancy page.');
    } catch (err) {
      const { fields, message: m } = fieldErrors(err);
      // "name" is the new category's name when one is being created (e.g. already taken; the project name's
      // length is checked above), otherwise the project's.
      const { name: nameError, ...rest } = fields;
      setErrors(nameError ? { ...rest, [isNew ? 'newGroup' : 'projectName']: nameError } : rest);
      setMessage(m);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={project ? 'Edit project' : 'Add a consultancy project'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>
            Cancel
          </button>
          <button type="submit" form="project-form" disabled={saving || uploading} className={btn.primary}>
            {saving ? 'Saving…' : project ? 'Save project' : 'Add project'}
          </button>
        </>
      }
    >
      <form id="project-form" onSubmit={save} className="space-y-4" noValidate>
        <Select label="Category" value={group} onChange={(e) => setGroup(e.target.value)} error={errors.group}>
          {groups.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
          {!project && <option value={NEW}>+ New category…</option>}
        </Select>
        {isNew && (
          <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 space-y-3">
            <GroupFields
              nameLabel="New category name"
              name={newName}
              tagline={newTagline}
              kind={newKind}
              onName={setNewName}
              onTagline={setNewTagline}
              onKind={setNewKind}
              errors={{ name: errors.newGroup, tagline: errors.tagline, kind: errors.kind }}
            />
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Project name" value={name} maxLength={160} onChange={(e) => setName(e.target.value)} error={errors.projectName || undefined} />
          {!products && (
            <Input
              label="Client name (optional)"
              value={clientName}
              maxLength={120}
              onChange={(e) => setClientName(e.target.value)}
              error={errors.clientName}
              hint="Listed under “Clients and partners”."
            />
          )}
        </div>
        <TextArea label="Description" rows={4} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} error={errors.description} />
        <Input label="Website (optional)" type="url" placeholder="https://…" value={url} maxLength={500} onChange={(e) => setUrl(e.target.value)} error={errors.url} hint="Only add a link that works." />

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Image (optional)</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="w-full sm:w-48 aspect-[16/10] rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-teal-600" aria-label="Uploading" />
              ) : image ? (
                <img src={image} alt="Project image preview" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-slate-400">No image</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id="project-image" onChange={(e) => upload(e.target.files?.[0])} />
              <label htmlFor="project-image" className={`${btn.secondary} ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                <ImagePlus className="w-4 h-4" aria-hidden="true" /> {image ? 'Replace image' : 'Upload image'}
              </label>
              {image && (
                <button type="button" onClick={() => setImage(null)} className={btn.secondary}>
                  Remove
                </button>
              )}
            </div>
          </div>
          <p className={`text-xs ${errors.image ? 'text-rose-600' : 'text-slate-500'}`}>
            {errors.image || 'JPEG, PNG or WebP, up to 2 MB. A wide image (about 16:10) on a white background looks best.'}
          </p>
        </div>

        <Toggle label="Published" checked={published} onChange={setPublished} hint="Hidden projects stay here but are not shown or counted on the site." />
        {message && <ErrorBox>{message}</ErrorBox>}
      </form>
    </Modal>
  );
};

const GroupForm: React.FC<{ group: AdminProjectGroup | null; onClose: () => void; onSaved: (message: string) => void }> = ({ group, onClose, onSaved }) => {
  const [name, setName] = useState(group?.name ?? '');
  const [tagline, setTagline] = useState(group?.tagline ?? '');
  const [kind, setKind] = useState<GroupKind>(group?.kind ?? 'clients');
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
      const body = { name: name.trim(), tagline: tagline.trim() || null, kind };
      if (group) await contentAdminApi.updateGroup(group.id, body);
      else await contentAdminApi.createGroup(body);
      onSaved(group ? 'Category saved.' : 'Category created. It appears on the Consultancy page once it has a project.');
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
      title={group ? 'Edit category' : 'New consultancy category'}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={btn.secondary}>
            Cancel
          </button>
          <button type="submit" form="group-form" disabled={saving} className={btn.primary}>
            {saving ? 'Saving…' : 'Save category'}
          </button>
        </>
      }
    >
      <form id="group-form" onSubmit={save} className="space-y-4" noValidate>
        <GroupFields name={name} tagline={tagline} kind={kind} onName={setName} onTagline={setTagline} onKind={setKind} errors={errors} />
        {group && <p className="text-xs text-slate-500">Link on the site: /consultancy#{group.slug} (it never changes, so shared links keep working).</p>}
        {message && <ErrorBox>{message}</ErrorBox>}
      </form>
    </Modal>
  );
};
