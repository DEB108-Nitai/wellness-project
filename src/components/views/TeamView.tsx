import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { contentApi, TeamMember } from '../../api/content';

/**
 * Our Team (/team): the six people from the company's previous homepage, in its order.
 * Data comes from GET /api/content/team (migration 009).
 */
interface Props {
  onNavigate: (view: string) => void;
}

const initials = (name: string) =>
  name
    .replace(/^Dr\.\s*/, '')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('');

export const TeamView: React.FC<Props> = ({ onNavigate }) => {
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    contentApi
      .team()
      .then(setTeam)
      .catch(() => setLoadError(true));
  }, []);

  return (
    <div className="pb-24">
      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/80 to-transparent">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.07]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-12 lg:pt-20 text-center space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Our Team</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 font-heading text-balance">
            The people behind Transenigma
          </h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-pretty">
            Researchers, engineers and practitioners working across psychology, technology and health.
          </p>
        </div>
      </section>

      {/* People */}
      <section aria-label="Team members" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {loadError && (
          <p role="alert" className="text-sm text-rose-600 text-center py-10">
            We could not load the team right now. Please refresh the page.
          </p>
        )}

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy={!team && !loadError}>
          {!team && !loadError &&
            Array.from({ length: 6 }, (_, i) => (
              <li key={i} aria-hidden="true" className="rounded-3xl border border-slate-200 bg-white overflow-hidden animate-pulse">
                <div className="aspect-square sm:aspect-[4/5] bg-slate-100" />
                <div className="p-6 space-y-3">
                  <div className="h-5 w-2/3 bg-slate-100 rounded" />
                  <div className="h-4 w-1/2 bg-slate-100 rounded" />
                  <div className="h-3 w-3/4 bg-slate-100 rounded" />
                </div>
              </li>
            ))}

          {team?.map((m) => (
            <li key={m.id}>
              <article className="group h-full flex flex-col rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
                <div className="relative aspect-square sm:aspect-[4/5] overflow-hidden bg-gradient-to-br from-teal-50 to-slate-100">
                  {m.photo ? (
                    <img
                      src={m.photo}
                      alt={`Portrait of ${m.name}`}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-5xl font-bold text-teal-700/60 font-heading">
                      {initials(m.name)}
                    </span>
                  )}
                  <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-900/25 to-transparent" />
                </div>
                <div className="flex-1 p-6">
                  <h2 className="text-xl font-bold text-slate-900 font-heading">{m.name}</h2>
                  <p className="mt-1 text-sm font-semibold text-teal-700">{m.role}</p>
                  <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-4">
                    {m.credentials.map((c) => (
                      <li key={c} className="text-sm text-slate-600 leading-snug">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </section>

      {/* Contact prompt */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="rounded-3xl bg-slate-50 border border-slate-200 px-6 py-10 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">Want to work with us?</h2>
            <p className="text-sm text-slate-600">Tell us about your project, research idea or question.</p>
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
