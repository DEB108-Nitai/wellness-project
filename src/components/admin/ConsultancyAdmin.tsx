import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ExternalLink, ImagePlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { AdminProject, contentAdminApi, ProjectGroup, ProjectInput } from '../../api/admin';
import { ApiError } from '../../api/client';
import { invalidateContentStats } from '../../hooks/useContentStats';
import { Badge, btn, ConfirmDialog, EmptyState, ErrorBox, fieldErrors, Input, LoadingBlock, Modal, PageHeader, Select, TextArea, Toggle } from './ui';

/**
 * Consultancy projects on /consultancy, by section. Client projects (every section except "Upcoming
 * products") are counted on the home page, and their client names fill "Clients and partners".
 */
type Data = { groups: { slug: ProjectGroup; name: string }[]; projects: AdminProject[] };
const UPCOMING: ProjectGroup = 'upcoming';

export const ConsultancyAdmin: React.FC = () => {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminProject | { group: ProjectGroup } | null>(null);
  const [deleting, setDeleting] = useState<AdminProject | null>(null);
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
      await contentAdminApi.deleteProject(deleting.id);
      setDeleting(null);
      changed('Project removed.');
    } catch (e) {
      setDeleteError(e instanceof ApiError ? e.message : 'Could not remove the project.');
    } finally {
      setBusy(false);
    }
  };

  const clientProjects = data?.projects.filter((p) => p.published && p.group !== UPCOMING).length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consultancy projects"
        description={
          data ? (
            <>
              <strong className="text-slate-800">{clientProjects}</strong> published client projects (the number on the home page). Upcoming products are shown
              separately and not counted.
            </>
          ) : undefined
        }
        actions={
          <button onClick={() => setEditing({ group: 'web-mobile' })} className={btn.primary} disabled={!data}>
            <Plus className="w-4 h-4" aria-hidden="true" /> Add project
          </button>
        }
      />
      {notice && (
        <p role="status" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-900">
          {notice}
        </p>
      )}
      {error && <ErrorBox onRetry={load}>{error}</ErrorBox>}
      {!data && !error && <LoadingBlock />}

      {data &&
        data.groups.map((g) => {
          const projects = data.projects.filter((p) => p.group === g.slug);
          return (
            <section key={g.slug} aria-label={g.name} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-slate-900">
                  {g.name} <span className="text-slate-400 font-medium">({projects.length})</span>
                </h2>
                <button onClick={() => setEditing({ group: g.slug })} className="inline-flex shrink-0 whitespace-nowrap items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800 cursor-pointer">
                  <Plus className="w-4 h-4" aria-hidden="true" /> Add here
                </button>
              </div>
              {projects.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-slate-300">
                  <EmptyState title="No projects in this section.">The section is hidden on the site until it has one.</EmptyState>
                </div>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {projects.map((p) => (
                    <li key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                      <div className="aspect-[16/9] bg-slate-50 border-b border-slate-100 flex items-center justify-center">
                        {p.image ? (
                          <img src={p.image} alt="" className="w-full h-full object-contain" loading="lazy" />
                        ) : (
                          <span className="text-xs text-slate-400">No image</span>
                        )}
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
                            <button onClick={() => setDeleting(p)} className={btn.icon} aria-label={`Remove ${p.name}`}>
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
      {deleting && (
        <ConfirmDialog
          title={`Remove “${deleting.name}”?`}
          message={<p>It disappears from the Consultancy page{deleting.group !== UPCOMING ? ' and the client project count' : ''}. This can't be undone.</p>}
          confirmLabel="Remove project"
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

const ProjectForm: React.FC<{
  project: AdminProject | null;
  defaultGroup: ProjectGroup;
  groups: Data['groups'];
  onClose: () => void;
  onSaved: (message: string) => void;
}> = ({ project, defaultGroup, groups, onClose, onSaved }) => {
  const [group, setGroup] = useState<ProjectGroup>(project?.group ?? defaultGroup);
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
  const upcoming = group === UPCOMING;

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
    if (name.trim().length < 2) local.name = 'Please enter the project name.';
    if (description.trim().length < 10) local.description = 'Please describe the project in a sentence or two.';
    if (Object.keys(local).length) return setErrors(local);

    const input: ProjectInput = {
      group,
      name: name.trim(),
      clientName: upcoming ? null : clientName.trim() || null,
      description: description.trim(),
      url: url.trim() || null,
      image,
      published,
    };
    setSaving(true);
    setErrors({});
    setMessage(null);
    try {
      if (project) await contentAdminApi.updateProject(project.id, input);
      else await contentAdminApi.createProject(input);
      onSaved(project ? 'Project saved.' : 'Project added to the Consultancy page.');
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
        <Select label="Section" value={group} onChange={(e) => setGroup(e.target.value as ProjectGroup)} error={errors.group}>
          {groups.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
        </Select>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Project name" value={name} maxLength={160} onChange={(e) => setName(e.target.value)} error={errors.name} />
          {!upcoming && (
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
