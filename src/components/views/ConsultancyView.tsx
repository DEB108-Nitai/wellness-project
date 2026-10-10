import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { contentApi, Consultancy, ConsultancyGroup, ConsultancyProject } from '../../api/content';
import { hashId } from '../../lib/routes';

/**
 * Consultancy (/consultancy, slice S8, owner-approved copy 2026-10-10): service areas with their client
 * projects, then the upcoming products. Each area has an anchor (/consultancy#enterprise, #web-mobile, #iot,
 * #upcoming) for the old site's redirects. Only working links get a "Visit site" button (migration 009).
 */
interface Props {
  onNavigate: (view: string) => void;
}

const UPCOMING = 'upcoming';

// Client names as plain text (no third-party logos), in the order the old site listed the work.
const CLIENTS = [
  'SALPG',
  'Mjunction (TATA-SAIL)',
  'Oil India',
  'ISKCON Kolkata',
  'Kolkata Ventures',
  'Annamrita',
  'Centre for Quantum Technologies, NUS',
  'Brainwave Science',
  'Yogavihara',
];

const ProjectCard: React.FC<{ project: ConsultancyProject; upcoming: boolean }> = ({ project, upcoming }) => (
  <li>
    <article className="group h-full flex flex-col rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className={`relative aspect-[16/10] overflow-hidden ${upcoming ? 'bg-indigo-50/70' : 'bg-white border-b border-slate-100'}`}>
        {project.image ? (
          // Most images are laptop mock-ups on white with different shapes: show them whole, centred.
          <img
            src={project.image}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-contain p-5 transition-transform duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 text-indigo-400 opacity-30 bg-[repeating-radial-gradient(circle_at_100%_0%,currentColor_0_1px,transparent_1px_14px)]" />
        )}
        {upcoming && (
          <span className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-900/10 backdrop-blur-sm">
            In development
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold text-slate-900 font-heading">{project.name}</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{project.description}</p>
        {project.url && (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto pt-5 self-start inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 underline-offset-4 hover:underline focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/20 rounded"
          >
            Visit site
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">(opens {project.name} in a new tab)</span>
          </a>
        )}
      </div>
    </article>
  </li>
);

const GroupSection: React.FC<{ group: ConsultancyGroup }> = ({ group }) => {
  const upcoming = group.slug === UPCOMING;
  return (
    <section id={group.slug} aria-labelledby={`${group.slug}-title`} className="scroll-mt-28">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-4">
        <div className="space-y-1.5">
          <h2 id={`${group.slug}-title`} className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-heading">
            {group.name}
          </h2>
          <p className={`text-base ${upcoming ? 'text-indigo-700' : 'text-teal-700'} font-medium`}>{group.tagline}</p>
        </div>
        <p className="text-sm text-slate-500 shrink-0">
          {group.projects.length} {upcoming ? (group.projects.length === 1 ? 'product' : 'products') : group.projects.length === 1 ? 'project' : 'projects'}
        </p>
      </div>
      <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {group.projects.map((p) => (
          <ProjectCard key={p.slug} project={p} upcoming={upcoming} />
        ))}
      </ul>
    </section>
  );
};

export const ConsultancyView: React.FC<Props> = ({ onNavigate }) => {
  const [data, setData] = useState<Consultancy | null>(null);
  const [loadError, setLoadError] = useState(false);
  const location = useLocation();

  useEffect(() => {
    contentApi
      .consultancy()
      .then(setData)
      .catch(() => setLoadError(true));
  }, []);

  // Land on /consultancy#<area> once the sections exist.
  useEffect(() => {
    if (!data || !location.hash) return;
    const id = hashId(location.hash);
    const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView(), 80);
    return () => window.clearTimeout(t);
  }, [data, location.hash, location.key]);

  const services = data?.groups.filter((g) => g.slug !== UPCOMING) ?? [];
  const upcoming = data?.groups.find((g) => g.slug === UPCOMING);
  const clientProjects = services.reduce((n, g) => n + g.projects.length, 0);

  return (
    <div className="pb-24">
      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/80 to-transparent">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.07]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-10 lg:pt-20 text-center space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Consultancy</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 font-heading text-balance">We build what matters.</h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-pretty">
            We design products and build technology for enterprises, public-sector organisations and social-impact initiatives.
          </p>
          {data && (
            <p className="text-sm font-semibold text-slate-700">
              {clientProjects} client projects · {services.length} service areas · {upcoming?.projects.length ?? 0} upcoming products
            </p>
          )}
        </div>
      </section>

      {/* Clients */}
      <section aria-labelledby="clients-title" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="clients-title" className="text-center text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Clients and partners
        </h2>
        <ul className="mt-4 flex flex-wrap justify-center gap-x-2 gap-y-2.5">
          {CLIENTS.map((c) => (
            <li key={c} className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700">
              {c}
            </li>
          ))}
        </ul>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 space-y-20" aria-busy={!data && !loadError}>
        {loadError && (
          <p role="alert" className="text-sm text-rose-600 text-center py-10">
            We could not load our projects right now. Please refresh the page.
          </p>
        )}

        {!data && !loadError && (
          <ul aria-hidden="true" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="rounded-3xl border border-slate-200 bg-white overflow-hidden animate-pulse">
                <div className="aspect-[16/10] bg-slate-100" />
                <div className="p-6 space-y-3">
                  <div className="h-5 w-1/2 bg-slate-100 rounded" />
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-5/6 bg-slate-100 rounded" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {services.map((g) => (
          <GroupSection key={g.slug} group={g} />
        ))}

        {upcoming && (
          <div className="rounded-[2rem] bg-gradient-to-b from-indigo-50/70 to-white border border-indigo-100 p-6 sm:p-10">
            <GroupSection group={upcoming} />
          </div>
        )}
      </div>

      {/* Contact prompt */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-20">
        <div className="rounded-3xl bg-slate-50 border border-slate-200 px-6 py-10 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">Have a project in mind?</h2>
            <p className="text-sm text-slate-600">Tell us what you’re building and our team will get back to you.</p>
          </div>
          <button
            onClick={() => onNavigate('contact')}
            className="shrink-0 h-12 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[15px] transition-colors inline-flex items-center gap-2 cursor-pointer focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/30"
          >
            Contact us
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </div>
  );
};
