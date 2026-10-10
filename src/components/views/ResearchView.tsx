import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ExternalLink, Search, X } from 'lucide-react';
import { contentApi, Research, ResearchCategory } from '../../api/content';
import { hashId } from '../../lib/routes';

/**
 * Research (/research): TERF publications from GET /api/content/research.
 * Each category is a section whose id is its slug, so /research#<slug> lands on it
 * (used by the home-page research cards). A sidebar (desktop) or chip row (phone)
 * jumps between categories; the search box filters every publication.
 */
export const ResearchView: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<Research | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<string>('');
  const chipRow = useRef<HTMLDivElement>(null);
  const sidebar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    contentApi
      .research()
      .then(setData)
      .catch(() => setLoadError(true));
  }, []);

  // Filter by the search words (every word must appear in the citation).
  const categories: ResearchCategory[] = useMemo(() => {
    if (!data) return [];
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return data.categories;
    return data.categories
      .map((c) => {
        const inName = words.every((w) => c.name.toLowerCase().includes(w));
        const publications = inName ? c.publications : c.publications.filter((p) => words.every((w) => p.citation.toLowerCase().includes(w)));
        return { ...c, publications, count: publications.length };
      })
      .filter((c) => c.count > 0);
  }, [data, query]);
  const matches = categories.reduce((n, c) => n + c.count, 0);

  // Land on /research#<slug> once the sections exist; repeat when the hash changes. Arriving from another
  // page (e.g. a homepage card) jumps straight there; moves within this page scroll smoothly.
  const landed = useRef(false);
  useEffect(() => {
    if (!data || !location.hash) return;
    const id = hashId(location.hash);
    const behavior: ScrollBehavior = landed.current ? 'smooth' : 'auto';
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior });
      landed.current = true;
    }, 80);
    return () => window.clearTimeout(t);
  }, [data, location.hash, location.key]);

  // Highlight the field being read: the last section whose top has passed the reading line
  // just below the sticky header (and chip row on phones). At the very bottom of the page,
  // the last section that is on screen wins, so short final fields can still be highlighted.
  useEffect(() => {
    if (!categories.length) return;
    const READING_LINE = 180;
    let frame = 0;
    const update = () => {
      frame = 0;
      const sections = categories.map((c) => document.getElementById(c.slug)).filter((el): el is HTMLElement => !!el);
      if (!sections.length) return;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      const line = atBottom ? window.innerHeight - 1 : READING_LINE;
      let current = sections[0];
      for (const s of sections) {
        if (s.getBoundingClientRect().top <= line) current = s;
        else break;
      }
      setActive(current.id);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [categories]);

  // Keep the active field visible in the phone chip row and in the desktop sidebar.
  useEffect(() => {
    const item = sidebar.current?.querySelector<HTMLElement>(`[data-slug="${active}"]`);
    const box = sidebar.current;
    if (item && box && (item.offsetTop < box.scrollTop || item.offsetTop + item.offsetHeight > box.scrollTop + box.clientHeight)) {
      box.scrollTo({ top: item.offsetTop - box.clientHeight / 2, behavior: 'smooth' });
    }
    const chip = chipRow.current?.querySelector<HTMLElement>(`[data-slug="${active}"]`);
    const row = chipRow.current;
    if (chip && row) row.scrollTo({ left: chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2, behavior: 'smooth' });
  }, [active]);

  const jump = (slug: string) => {
    const same = location.hash === `#${slug}`;
    navigate({ pathname: '/research', hash: slug }, { replace: same });
    if (same) document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth' });
  };

  const totals = data?.totals;

  return (
    <div className="pb-24">
      {/* Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/80 to-transparent">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(#0d9488_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.07]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 pt-16 pb-10 lg:pt-20 text-center space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">TERF · Trans Enigma Research Foundation</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 font-heading text-balance">Our research</h1>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-pretty">
            {totals ? `${totals.publications} publications across ${totals.categories} fields` : 'Publications across many fields'}, from computational
            psychology and AI-led drug discovery to Vedic psychology, leadership and governance.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loadError && (
          <p role="alert" className="text-sm text-rose-600 text-center py-10">
            We could not load our research right now. Please refresh the page.
          </p>
        )}

        {!data && !loadError && (
          <div aria-busy="true" className="space-y-4 py-6 animate-pulse">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-100" />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* Search */}
            <div className="max-w-2xl mx-auto mb-8">
              <label htmlFor="research-search" className="sr-only">Search publications</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" aria-hidden="true" />
                <input
                  id="research-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by title, author, venue or year"
                  className="w-full h-12 pl-11 pr-11 rounded-2xl bg-white border border-slate-300 text-[15px] text-slate-900 placeholder:text-slate-400 shadow-2xs focus:outline-hidden focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p aria-live="polite" className="mt-2 text-sm text-slate-500 text-center min-h-5">
                {query && (matches ? `${matches} publication${matches === 1 ? '' : 's'} found` : 'No publications match your search.')}
              </p>
            </div>

            {/* Phone/tablet: category chips */}
            <nav aria-label="Research fields" className="lg:hidden sticky top-[72px] z-20 -mx-4 sm:-mx-6 mb-6 bg-white/90 backdrop-blur-sm border-y border-slate-200">
              <div ref={chipRow} className="flex gap-2 overflow-x-auto px-4 sm:px-6 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categories.map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    data-slug={c.slug}
                    onClick={() => jump(c.slug)}
                    aria-current={active === c.slug ? 'true' : undefined}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap border transition-colors cursor-pointer ${
                      active === c.slug ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-700 hover:border-teal-300'
                    }`}
                  >
                    {c.name} <span className={active === c.slug ? 'text-teal-100' : 'text-slate-400'}>{c.count}</span>
                  </button>
                ))}
              </div>
            </nav>

            <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-12">
              {/* Desktop: category sidebar */}
              <nav aria-label="Research fields" className="hidden lg:block">
                <div ref={sidebar} className="sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 pb-4 [scrollbar-width:thin]">
                  <p className="px-3 mb-3 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Research fields</p>
                  <ul className="space-y-0.5">
                    {categories.map((c) => (
                      <li key={c.slug}>
                        <button
                          type="button"
                          data-slug={c.slug}
                          onClick={() => jump(c.slug)}
                          aria-current={active === c.slug ? 'true' : undefined}
                          className={`w-full text-left flex items-start justify-between gap-3 px-3 py-2 rounded-xl text-sm leading-snug transition-colors cursor-pointer ${
                            active === c.slug ? 'bg-teal-50 text-teal-800 font-semibold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`}
                        >
                          <span>{c.name}</span>
                          <span className={`shrink-0 text-xs mt-0.5 ${active === c.slug ? 'text-teal-700' : 'text-slate-400'}`}>{c.count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </nav>

              {/* Publications */}
              <div className="space-y-12 min-w-0">
                {categories.map((c) => (
                  <section key={c.slug} id={c.slug} aria-labelledby={`${c.slug}-title`} className="scroll-mt-40 lg:scroll-mt-28">
                    <div className="flex items-baseline justify-between gap-4 pb-3 mb-4 border-b border-slate-200">
                      <h2 id={`${c.slug}-title`} className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
                        {c.name}
                      </h2>
                      <span className="shrink-0 text-sm text-slate-500">
                        {c.count} {c.count === 1 ? 'publication' : 'publications'}
                      </span>
                    </div>
                    <ol className="space-y-3">
                      {c.publications.map((p) => (
                        <li key={p.id} className="flex flex-col sm:flex-row gap-2.5 sm:gap-4 rounded-2xl bg-white border border-slate-200 p-4 sm:p-5 hover:border-teal-200 hover:shadow-xs transition-colors">
                          <span
                            className={`self-start shrink-0 w-14 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                              p.year ? 'bg-teal-50 text-teal-800' : 'bg-slate-50 text-slate-400'
                            }`}
                          >
                            {p.year ?? 'n.d.'}
                          </span>
                          <div className="min-w-0 space-y-2">
                            <p className="text-sm sm:text-[15px] text-slate-700 leading-relaxed break-words">{p.citation}</p>
                            {p.url && (
                              <a
                                href={p.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800 hover:underline underline-offset-4"
                              >
                                Read the paper
                                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                                <span className="sr-only">(opens in a new tab)</span>
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
