import React from 'react';
import { ArrowRight, Cpu, FlaskConical, HeartPulse } from 'lucide-react';
import { useAppNavigate, useSectionNavigate } from '../../lib/routes';

/**
 * Research, Consultancy and Programs: the three disciplines behind Transenigma.
 * Owner-approved copy (2026-10-09), facts from the company's previous website.
 * Each card links to its page (view) or home-page section; Consultancy gets its link once that page exists.
 */
interface Discipline {
  icon: React.ElementType;
  label: string;
  title: string;
  stat: string;
  text: string;
  note?: string;
  link?: { label: string; view?: string; section?: string };
  tone: string;
}

const DISCIPLINES: Discipline[] = [
  {
    icon: FlaskConical,
    label: 'Research',
    title: 'Science, published.',
    stat: '97 publications · 15 research fields',
    text: 'Through the Trans Enigma Research Foundation (TERF): computational psychology, AI-led drug discovery, the science of happiness, Sankhya and Ayurveda, leadership and governance.',
    note: 'Published with IEEE/ACM, Springer and the Journal of Financial Crime.',
    link: { label: 'Explore our research', view: 'research' },
    tone: 'bg-teal-50 text-teal-700 ring-teal-100',
  },
  {
    icon: Cpu,
    label: 'Consultancy',
    title: 'Technology, delivered.',
    stat: '9 client projects',
    text: 'Enterprise platforms, web and mobile apps and IoT systems for Mjunction (TATA-SAIL), SALPG (HPCL–Total), Oil India, ISKCON and the Centre for Quantum Technologies, NUS.',
    tone: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  },
  {
    icon: HeartPulse,
    label: 'Programs',
    title: 'Lives, transformed.',
    stat: '3 free 60-day programs',
    text: 'Sonic, Philosophical and Transcendental Therapeutic Interventions: guided journeys that turn self-knowledge into lasting change.',
    link: { label: 'See the programs', section: '60-days-challenge' },
    tone: 'bg-amber-50 text-amber-700 ring-amber-100',
  },
];

export const FoundationSection: React.FC = () => {
  const goToSection = useSectionNavigate();
  const goTo = useAppNavigate();
  const follow = (link: NonNullable<Discipline['link']>) => (link.section ? goToSection(link.section) : link.view && goTo(link.view));

  return (
    <section aria-labelledby="foundation-title" className="bg-slate-50/80 border-b border-slate-200/70 py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">The Transenigma foundation</p>
          <h2 id="foundation-title" className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 font-heading text-balance">
            Three disciplines. One purpose.
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Our research shapes our technology, and both come together in programs that help people change for good.
          </p>
        </div>

        <ul className="mt-12 grid gap-5 lg:gap-6 md:grid-cols-3">
          {DISCIPLINES.map((d) => {
            const Icon = d.icon;
            return (
              <li key={d.label} className="flex flex-col bg-white rounded-3xl border border-slate-200 p-7 shadow-xs hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                  <span className={`w-11 h-11 rounded-2xl ring-1 flex items-center justify-center ${d.tone}`}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{d.label}</span>
                </div>
                <h3 className="mt-6 text-2xl font-bold text-slate-900 font-heading">{d.title}</h3>
                <p className="mt-1.5 text-sm font-semibold text-teal-700">{d.stat}</p>
                <p className="mt-4 text-sm text-slate-600 leading-relaxed">{d.text}</p>
                <div className="mt-auto pt-5 space-y-3">
                  {d.note && <p className="text-xs text-slate-500 italic">{d.note}</p>}
                  {d.link && (
                    <button
                      type="button"
                      onClick={() => follow(d.link!)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 underline-offset-4 hover:underline cursor-pointer focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/20 rounded"
                    >
                      {d.link.label}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
