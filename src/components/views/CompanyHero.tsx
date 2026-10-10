import React from 'react';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { useActiveSession } from '../../context/ActiveSessionContext';
import { useSectionNavigate } from '../../lib/routes';

/**
 * Opening band of the home page: Transenigma's mission in a compact dark hero.
 * Owner-approved copy (2026-10-09). The rest of the page stays light and calm.
 */
interface Props {
  onNavigate: (view: string) => void;
}

export const CompanyHero: React.FC<Props> = ({ onNavigate }) => {
  const goToSection = useSectionNavigate();
  const { active: activeDraft, progress: draftProgress } = useActiveSession();
  const resuming = !!activeDraft && activeDraft.answeredCount > 0;

  return (
    <section
      aria-labelledby="company-hero-title"
      className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]" />
      <div aria-hidden="true" className="absolute -top-40 -left-24 w-[32rem] h-[32rem] rounded-full bg-teal-500/20 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-48 right-0 w-[30rem] h-[30rem] rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28 text-center">
        <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.22em] text-teal-300">
          Research · Health · Education
        </p>

        <h1
          id="company-hero-title"
          className="mt-6 text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] font-heading text-balance"
        >
          Transcend the enigma.
          <span className="block mt-1 bg-gradient-to-r from-teal-300 via-teal-200 to-emerald-200 bg-clip-text text-transparent">
            Transform your life.
          </span>
        </h1>

        <p className="mt-7 text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto text-pretty">
          Transenigma is a research and technology company with one mission: to turn the science of the mind into tools that
          change lives. After 97 publications and years of work for industry, now we build health care and education products for
          everyone.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => onNavigate('test')}
            className="w-full sm:w-auto h-12 px-7 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-[15px] shadow-lg shadow-teal-500/25 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer group focus:outline-hidden focus-visible:ring-4 focus-visible:ring-teal-300/40"
          >
            {resuming ? (
              <>
                <PlayCircle className="w-5 h-5" />
                Continue your assessment ({draftProgress}%)
              </>
            ) : (
              <>
                Take your personality assessment
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
          <button
            onClick={() => goToSection('60-days-challenge')}
            className="w-full sm:w-auto h-12 px-7 rounded-xl border border-white/25 hover:bg-white/10 text-white font-semibold text-[15px] transition-colors inline-flex items-center justify-center cursor-pointer focus:outline-hidden focus-visible:ring-4 focus-visible:ring-white/30"
          >
            Explore our programs
          </button>
        </div>
      </div>
    </section>
  );
};
