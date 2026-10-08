import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Calendar,
  Users,
  BrainCircuit,
  Flame,
  Zap,
  Repeat,
  Compass,
  Check,
  Award,
  BookOpen,
  Send,
  X,
  Volume2,
  Waves,
  Heart,
  Music,
  Headphones,
  ShieldCheck,
  Sun
} from 'lucide-react';
import { ProgramCode } from '../../api/challenge';
import { PROGRAM_ANCHORS } from '../../lib/routes';
import { ProgramPhoto } from '../challenge/ProgramPhoto';
import { StiProgram } from '../challenge/StiProgram';
import { PtiProgram } from '../challenge/PtiProgram';
import { RegistrationModal } from '../challenge/RegistrationModal';

export const ChallengeSection: React.FC = () => {
  // Program filter and the registration modal (one form for all three programs).
  const [activeTab, setActiveTab] = useState<'both' | 'sti' | 'pti' | 'tti'>('both');
  const [modalProgram, setModalProgram] = useState<ProgramCode | null>(null);

  // A link to one program (/#sonic-therapy etc.) must find its block even if the filter hides it.
  const { hash, key } = useLocation();
  useEffect(() => {
    if ((Object.values(PROGRAM_ANCHORS) as string[]).includes(hash.slice(1))) setActiveTab('both');
  }, [hash, key]);

  return (
    <section id="60-days-challenge" className="scroll-mt-18 relative overflow-hidden py-20 bg-gradient-to-b from-[#FAF8F5] via-amber-50/30 to-white border-t border-amber-200/60">
      {/* Decorative Golden & Teal Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-300/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-10 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* SECTION HEADER */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-100 to-teal-100 border border-amber-300 text-slate-800 text-xs font-bold tracking-wider uppercase shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>60 Days Life Transformation Programs</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 font-heading">
            Our Three 60-Day <span className="bg-gradient-to-r from-teal-700 via-indigo-700 to-amber-700 bg-clip-text text-transparent">Transformation Challenges</span>
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
            Break the stagnation loop, master your mind, elevate consciousness, and awaken true potential through our three proven 60-day scientific & spiritual methodologies.
          </p>

          {/* Program Toggle Filter */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setActiveTab('both')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'both'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All 60-Day Programs (3)
            </button>
            <button
              onClick={() => setActiveTab('sti')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'sti'
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'bg-white text-teal-800 border border-teal-200 hover:bg-teal-50'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Sonic (STI)</span>
            </button>
            <button
              onClick={() => setActiveTab('pti')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'pti'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white text-indigo-800 border border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Philosophical (PTI)</span>
            </button>
            <button
              onClick={() => setActiveTab('tti')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tti'
                  ? 'bg-amber-700 text-white shadow-md'
                  : 'bg-white text-amber-900 border border-amber-200 hover:bg-amber-50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Transcendental (TTI)</span>
            </button>
          </div>
        </div>

        {/* PROGRAM 01: SONIC THERAPEUTIC INTERVENTION (STI) */}
        {(activeTab === 'both' || activeTab === 'sti') && <StiProgram onRegister={() => setModalProgram('STI')} />}

        {/* PROGRAM 02: PHILOSOPHICAL THERAPEUTIC INTERVENTION (PTI) */}
        {(activeTab === 'both' || activeTab === 'pti') && <PtiProgram onRegister={() => setModalProgram('PTI')} />}

        {/* ========================================================================= */}
        {/* PROGRAM 03: TRANSCENDENTAL THERAPEUTIC INTERVENTION (TTI) */}
        {/* ========================================================================= */}
        {(activeTab === 'both' || activeTab === 'tti') && (
          <div id={PROGRAM_ANCHORS.TTI} className="scroll-mt-24 bg-white rounded-3xl border border-amber-200/90 shadow-xl overflow-hidden space-y-8">
            <div className="p-6 sm:p-10 lg:p-12 space-y-10">
              {/* Program Header Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-6">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider border border-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Program 03 · 60 Days Challenge</span>
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-black text-slate-900 font-heading">
                    Transcendental Therapeutic Intervention (TTI)
                  </h3>
                  <p className="text-xs sm:text-sm font-bold tracking-widest text-slate-500 uppercase">
                    DISCOVER • REFLECT • DISCUSS • PRACTISE • TRANSFORM
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xs shadow-xs uppercase">
                    60 Days · Reform and Transform
                  </span>
                </div>
              </div>

              {/* CONTRAST: The Stagnation Cycle vs The Transformed Life */}
              <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch rounded-2xl overflow-hidden border border-amber-200/80 shadow-md">
                {/* Left: The Stagnation Loop */}
                <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 flex flex-col gap-6">
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-xs font-bold uppercase tracking-wider border border-rose-500/30">
                      <Repeat className="w-3.5 h-3.5 animate-spin duration-3000" />
                      <span>The Stagnation Cycle</span>
                    </div>

                    <h4 className="text-xl sm:text-2xl font-bold font-heading text-rose-200">
                      Trapped in the Loop?
                    </h4>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Most struggles aren't failures of intelligence—they are repetitive neuro-behavioral loops holding your potential captive.
                    </p>

                    <ProgramPhoto program="tti" fill minHeight="lg:min-h-[150px]" />

                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-medium text-slate-300">
                      {[
                        'Stress & Anxiety',
                        'Distractions',
                        'Addictions',
                        'Meaningless Routine',
                        'Overthinking',
                        'Procrastination',
                        'Doomscrolling',
                        'No Real Progress',
                      ].map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                          <span className="leading-tight">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-700 text-xs text-rose-300/90 font-mono">
                    "Don’t Bloop. Break the Loop."
                  </div>
                </div>

                {/* Right: The Transformed Living */}
                <div className="lg:col-span-7 bg-gradient-to-br from-amber-50/80 via-white to-teal-50/50 p-6 sm:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider border border-amber-300">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>60 Days of Transformed Living</span>
                    </div>

                    <h4 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
                      A Calmer Mind, A Kinder You, Brighter Tomorrows.
                    </h4>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                      Through structured daily reflection, guided peer discourse circles, habit restructuring, and consciousness elevation, we systematically reprogram mental modes from anxiety to vibrant mastery.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {[
                        { label: 'Discuss, Learn & Grow', desc: 'Engage in structured reflection circles with mentors and like-minded peers.' },
                        { label: 'Apply & Transcend', desc: 'Practical mindfulness, sleep architecture, and vice deconstruction daily.' },
                        { label: 'Bigger Goals Realized', desc: 'Direct mental energy away from trivial friction into impactful creative mastery.' },
                        { label: 'Become a Better You', desc: 'Sustainable mental poise, emotional resilience, and authentic purpose.' },
                      ].map((feat, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white border border-amber-200/60 shadow-2xs space-y-1.5">
                          <h5 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-teal-600" />
                            <span>{feat.label}</span>
                          </h5>
                          <p className="text-xs text-slate-500 leading-relaxed">{feat.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Register Trigger Bar */}
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-amber-100">
                    <div>
                      <span className="text-xs font-bold text-slate-900 block font-heading">
                        Ready to Transform Your Life?
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Daily mentor guidance, habit tracking & peer discourse.
                      </span>
                    </div>

                    <button
                      onClick={() => setModalProgram('TTI')}
                      className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Register for 60-Day TTI Challenge</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 4 CORE PILLARS FROM THE POSTER */}
              <div className="space-y-6 pt-4">
                <div className="text-center max-w-2xl mx-auto space-y-1.5">
                  <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                    The Four Cornerstones
                  </span>
                  <h4 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
                    Four Pillars of Transcendental Transformation
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {/* Pillar 1 */}
                  <div className="bg-white rounded-2xl p-5 border border-amber-200/80 shadow-2xs flex flex-col items-center text-center space-y-3 hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-inner">
                      <Award className="w-7 h-7 text-amber-600" />
                    </div>
                    <h5 className="text-sm font-bold text-slate-900 font-heading">
                      Unleash Your Potentiality
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Overcome self-limiting beliefs and channel latent strengths into constructive, meaningful achievements.
                    </p>
                  </div>

                  {/* Pillar 2 */}
                  <div className="bg-white rounded-2xl p-5 border border-rose-200/80 shadow-2xs flex flex-col items-center text-center space-y-3 hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shadow-inner">
                      <Flame className="w-7 h-7 text-rose-600" />
                    </div>
                    <h5 className="text-sm font-bold text-slate-900 font-heading">
                      Break the Shackles of Vices
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Deconstruct addictive habits, compulsive screen time, and toxic behaviors with proven therapeutic protocols.
                    </p>
                  </div>

                  {/* Pillar 3 */}
                  <div className="bg-white rounded-2xl p-5 border border-blue-200/80 shadow-2xs flex flex-col items-center text-center space-y-3 hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shadow-inner">
                      <Repeat className="w-7 h-7 text-blue-600" />
                    </div>
                    <h5 className="text-sm font-bold text-slate-900 font-heading">
                      Don’t Bloop, Get Out of the Loop
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Shatter procrastination and mental paralysis. Replace idle scrolling with proactive daily momentum.
                    </p>
                  </div>

                  {/* Pillar 4 */}
                  <div className="bg-white rounded-2xl p-5 border border-purple-200/80 shadow-2xs flex flex-col items-center text-center space-y-3 hover:shadow-md transition-all">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shadow-inner">
                      <BrainCircuit className="w-7 h-7 text-purple-600" />
                    </div>
                    <h5 className="text-sm font-bold text-slate-900 font-heading">
                      Elevate Consciousness & Modes
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Uplift mental states from Rajas (anxiety/agitation) and Tamas (lethargy) into pure Sattva (clarity and balance).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unified registration modal for STI / PTI / TTI */}
      {modalProgram && <RegistrationModal initialProgram={modalProgram} onClose={() => setModalProgram(null)} />}
    </section>
  );
};
