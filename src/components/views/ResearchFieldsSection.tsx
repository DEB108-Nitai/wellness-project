import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { contentApi, Research, ResearchCategory } from '../../api/content';

/**
 * Homepage research cards (slice S7b, owner-approved copy 2026-10-10): one card per research field,
 * each linking to /research#<slug>. On wider screens the row glides as a pure-CSS marquee (paused on
 * hover/focus, still when the visitor prefers reduced motion); on phones it is a swipe row.
 * Data and taglines come from GET /api/content/research (migrations 009 and 016).
 */

// Five calm accents and four abstract patterns, combined so neighbouring cards differ.
const ACCENTS = [
  { panel: 'bg-teal-50', ink: 'text-teal-500', num: 'text-teal-700' },
  { panel: 'bg-indigo-50', ink: 'text-indigo-500', num: 'text-indigo-700' },
  { panel: 'bg-amber-50', ink: 'text-amber-500', num: 'text-amber-700' },
  { panel: 'bg-rose-50', ink: 'text-rose-500', num: 'text-rose-700' },
  { panel: 'bg-sky-50', ink: 'text-sky-500', num: 'text-sky-700' },
];
const PATTERNS = [
  'bg-[radial-gradient(currentColor_1.5px,transparent_1.5px)] [background-size:16px_16px]',
  'bg-[repeating-linear-gradient(45deg,currentColor_0_1px,transparent_1px_12px)]',
  'bg-[repeating-radial-gradient(circle_at_100%_0%,currentColor_0_1px,transparent_1px_14px)]',
  'bg-[linear-gradient(currentColor_1px,transparent_1px),linear-gradient(90deg,currentColor_1px,transparent_1px)] [background-size:22px_22px]',
];

const FieldCard: React.FC<{ field: ResearchCategory; index: number; hidden?: boolean }> = ({ field, index, hidden }) => {
  const accent = ACCENTS[index % ACCENTS.length];
  return (
    <li className="w-72 shrink-0 snap-start">
      <Link
        to={`/research#${field.slug}`}
        tabIndex={hidden ? -1 : undefined}
        className="group/card flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/25"
      >
        <div className={`relative h-28 overflow-hidden ${accent.panel}`}>
          <div aria-hidden="true" className={`absolute inset-0 opacity-25 ${accent.ink} ${PATTERNS[index % PATTERNS.length]}`} />
          <span aria-hidden="true" className={`absolute left-5 bottom-3 text-4xl font-extrabold font-heading tabular-nums ${accent.num} opacity-80`}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="absolute right-4 top-4 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-900/5 backdrop-blur-sm">
            {field.count} {field.count === 1 ? 'paper' : 'papers'}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-base font-bold leading-snug text-slate-900 font-heading line-clamp-2 min-h-[2.75rem]">{field.name}</h3>
          {field.tagline && <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-3">{field.tagline}</p>}
          <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700">
            Read the papers
            <ArrowRight className="w-4 h-4 transition-transform group-hover/card:translate-x-0.5" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </li>
  );
};

export const ResearchFieldsSection: React.FC = () => {
  const [data, setData] = useState<Research | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    contentApi
      .research()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  // The homepage keeps going quietly if the API is unavailable; the Research page shows the error.
  if (failed) return null;

  const fields = data?.categories ?? [];

  return (
    <section aria-labelledby="research-fields-title" className="border-t border-slate-200/70 bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Trans Enigma Research Foundation</p>
            <h2 id="research-fields-title" className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 font-heading text-balance">
              Fifteen fields of research behind everything we build.
            </h2>
            <p className="text-base text-slate-600 leading-relaxed text-pretty">
              {data?.totals.publications ?? 97} publications across psychology, leadership, governance, spirituality, materials
              science and computing. Choose a field to read its papers.
            </p>
          </div>
          <Link
            to="/research"
            className="self-start md:self-auto inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 underline-offset-4 hover:underline focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-500/20 rounded"
          >
            See all research
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* The row: marquee from md up (two identical lists, the copy hidden from assistive tech), swipe row on phones. */}
      <div
        className="research-marquee group mt-10 overflow-x-auto md:overflow-hidden snap-x snap-mandatory scroll-px-4 sm:scroll-px-6 md:snap-none motion-reduce:md:overflow-x-auto [scrollbar-width:none] md:motion-safe:[mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]"
        aria-busy={!data}
      >
        {!data ? (
          <ul aria-hidden="true" className="flex gap-5 px-4 sm:px-6 lg:px-8 pb-2">
            {Array.from({ length: 5 }, (_, i) => (
              <li key={i} className="h-[19rem] w-72 shrink-0 animate-pulse rounded-3xl border border-slate-200 bg-slate-50" />
            ))}
          </ul>
        ) : (
          <div className="flex w-max py-2 md:motion-safe:animate-[research-marquee_110s_linear_infinite] group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]">
            <ul aria-label="Research fields" className="flex gap-5 pl-4 sm:pl-6 lg:pl-8 pr-5">
              {fields.map((f, i) => (
                <FieldCard key={f.slug} field={f} index={i} />
              ))}
            </ul>
            <ul aria-hidden="true" className="hidden md:motion-safe:flex gap-5 pl-4 sm:pl-6 lg:pl-8 pr-5">
              {fields.map((f, i) => (
                <FieldCard key={f.slug} field={f} index={i} hidden />
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
};
