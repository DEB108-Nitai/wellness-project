import React, { useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  BarChart3,
  Users,
  Compass,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Award,
  Search,
  BookOpen,
  HelpCircle,
  BrainCircuit,
  Lock,
  Layers,
  FileText,
  PlayCircle,
  RotateCcw
} from 'lucide-react';
import { FACTORS_DATA } from '../../data/factorsData';
import { FactorCard } from '../common/FactorCard';
import { ChallengeSection } from './ChallengeSection';
import { useActiveSession } from '../../context/ActiveSessionContext';

interface LandingViewProps {
  onNavigate: (view: string, param?: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  // In-progress assessment for this visitor (account or guest browser), from the API.
  const { active: activeDraft, progress: draftProgress, abandon } = useActiveSession();

  const handleStartFresh = async () => {
    if (activeDraft) {
      try {
        await abandon();
      } catch {
        // already gone — start a new one anyway
      }
    }
    onNavigate('test');
  };
  const factorList = Object.values(FACTORS_DATA);

  // Key uses matching the user's reference image
  const benefits = [
    {
      title: "Improves business results through better people management",
      desc: "Align individual natural behavioral strengths with organizational objectives to maximize performance and engagement.",
      icon: Users,
    },
    {
      title: "Enables the right selection and development decisions",
      desc: "Make objective talent decisions grounded in scientific personality traits rather than superficial interview impressions.",
      icon: Award,
    },
    {
      title: "Promotes more probing and insightful interviews with structured prompts",
      desc: "Use dimensional trait profiles to guide deep, structured behavioral interviewing and leadership assessments.",
      icon: Search,
    },
    {
      title: "Enables you to see the whole picture when it comes to talent management",
      desc: "Understand whole-person personality dynamics: cognitive style, emotional resilience, relational warmth, and self-control.",
      icon: BrainCircuit,
    },
    {
      title: "Reduces risk in decision making about key roles",
      desc: "Identify potential friction points and developmental needs before committing to executive appointments.",
      icon: TrendingUp,
    },
  ];

  const steps = [
    {
      num: "01",
      title: "Consent & Demographics",
      desc: "Set your preferences in under 1 minute. Anonymized and strictly secure under privacy standards.",
    },
    {
      num: "02",
      title: "Answer Statements",
      desc: "Respond to 166 short statements across 24 screens using our intuitive circular agree-to-disagree scale.",
    },
    {
      num: "03",
      title: "Instant Sten Scoring",
      desc: "Our automated engine normalizes your raw answers against calibrated population benchmarks on a 1-10 Sten scale.",
    },
    {
      num: "04",
      title: "Visual Profile & Export",
      desc: "Explore your 16-factor bipolar spectrum, strengths and growth areas, and download a presentation-ready report.",
    },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* SECTION 1: HERO */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:py-24 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white">
        {/* Abstract background decorative grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-xs font-semibold tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-teal-300" />
              <span>Scientific Well-Being & Holistic Transformation</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white font-heading">
              Scientific 16 Personality Factors Assessment
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
              Empowering deep self-understanding and sustainable life transformation. Complete your standardized personality profile or join our flagship 60-day transformation challenges.
            </p>

            {/* Hero Primary CTA: Dynamic Continue Assessment or Start Free Assessment */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {activeDraft && activeDraft.answeredCount > 0 ? (
                <>
                  <button
                    onClick={() => onNavigate('test')}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-base shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer ring-2 ring-teal-300"
                  >
                    <PlayCircle className="w-5 h-5 text-slate-950" />
                    <span>Continue Assessment ({draftProgress}% Done)</span>
                  </button>
                  <button
                    onClick={handleStartFresh}
                    className="text-xs text-slate-300 hover:text-white px-4 py-2 flex items-center gap-1.5 transition-colors underline cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>or Start Over</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onNavigate('test')}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 font-bold text-base shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2.5 cursor-pointer group"
                >
                  <span>Start Free Assessment</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>

            {/* Trust Chips */}
            <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-400" />
                <span>~20–25 Minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>100% Free & Confidential</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-teal-400" />
                <span>GDPR & DPDP Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-400" />
                <span>Instant Sten (1-10) Visual Profile</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: ABOUT THE 16 FACTORS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-8 sm:p-12 lg:p-14 border border-slate-200 shadow-sm space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Psychological Framework
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 font-heading">
              About the 16 Personality Factors
            </h2>
          </div>

          <div className="max-w-4xl mx-auto space-y-6 text-slate-700 text-sm sm:text-base leading-relaxed">
            <p className="text-center font-medium text-slate-800 italic">
              "Personality is what we are, and behaviour is what we do."
            </p>
            
            <p>
              The 16 Personality Factors assessment is a robust, reliable measure of 16 core personality traits that describe and predict a person's behaviour in a variety of professional and personal contexts. The instrument is widely used across organizations to select, develop, and motivate the people who make teams thrive.
            </p>

            <p>
              Grounded in the public-domain International Personality Item Pool (IPIP), the assessment provides a rich breadth of insights across diverse professional applications—such as <strong>Recruitment, Leadership Development, Executive Coaching, Career Advisory, Succession Planning, and Organizational Teaming</strong>. It allows individuals and leaders to objectively understand who people are by examining the whole personality matrix rather than fleeting situational reactions.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
              {[
                'Recruitment',
                'Leadership Coaching',
                'Career Planning',
                'Talent Retention',
                'Succession Review',
                'Team Cohesion',
              ].map((useCase) => (
                <div key={useCase} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-semibold text-slate-800">
                  {useCase}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: THE 16 PERSONALITY FACTORS GRID (Matching 4x4 cards) */}
      <section id="factors-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
            Dimensional Spectrum
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 font-heading">
            The 16 Personality Factors
          </h2>
          <p className="text-sm text-slate-600">
            Click on any card to flip and explore the opposing behavioral poles and psychological definitions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {factorList.map((factor) => (
            <FactorCard
              key={factor.code}
              factor={factor}
              onExplore={(code) => onNavigate('factors', code)}
            />
          ))}
        </div>
      </section>

      {/* SECTION 4: OUR 4-STEP PROCESS */}
      <section className="bg-slate-900 text-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
              Assessment Flow
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-white font-heading">
              Our 4-Step Process
            </h2>
            <p className="text-sm text-slate-300">
              Designed for a smooth, uninterrupted, and scientifically rigorous user experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div
                key={s.num}
                className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700 flex flex-col justify-between space-y-4 hover:border-teal-500/50 transition-colors"
              >
                <div className="space-y-3">
                  <span className="text-2xl font-black font-mono text-teal-400">
                    {s.num}
                  </span>
                  <h3 className="text-lg font-bold text-white font-heading">
                    {s.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <button
              onClick={() => onNavigate('test')}
              className="px-8 py-3.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-md transition-all cursor-pointer"
            >
              Begin Your Assessment Now
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 5: KEY USES & BENEFITS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
            Organizational Value
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 font-heading">
            Key Uses & Benefits
          </h2>
          <p className="text-sm text-slate-600">
            How objective 16-factor psychometrics empowers leadership, talent development, and personal growth.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
          {benefits.map((b, idx) => {
            const Icon = b.icon;
            return (
              <div
                key={idx}
                className="bg-gradient-to-b from-[#5B88C4] to-[#4572AF] text-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center space-y-4 justify-between"
              >
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shadow-inner">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold leading-snug font-heading">
                  {b.title}
                </h3>
                <p className="text-xs text-blue-100/90 leading-relaxed pt-2 border-t border-white/20">
                  {b.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 6: WHAT YOU RECEIVE */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                Comprehensive Feedback
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold text-slate-900 font-heading">
                What You Get Upon Completion
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Immediately following your test submission, your answers are calculated against calibrated norm distributions to provide an instant, interactive report:
              </p>

              <div className="space-y-3.5">
                {[
                  { title: "16-Factor Sten Visualizer", desc: "Detailed 1 to 10 scale charts showing where you land between opposite behavioral poles." },
                  { title: "5 Global Personality Domains", desc: "Extraversion, Anxiety, Tough-Mindedness, Independence, and Self-Control summaries." },
                  { title: "Strengths & Growth Matrix", desc: "Personalized breakdown of your top distinctive traits and suggested development actions." },
                  { title: "Printable / PDF Report", desc: "Formatted diagnostic report ready for your personal development or organization." },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual illustration of result card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Sample Sten Profile</h4>
                  <span className="text-xs text-slate-500">IPIP-16 Factor Normed Result</span>
                </div>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md">
                  Completed
                </span>
              </div>

              <div className="space-y-3 py-1">
                {[
                  { name: 'Warmth (A)', sten: 8, band: 'High' },
                  { name: 'Reasoning (B)', sten: 7, band: 'Avg' },
                  { name: 'Emotional Stability (C)', sten: 9, band: 'High' },
                  { name: 'Dominance (E)', sten: 6, band: 'Avg' },
                  { name: 'Perfectionism (Q3)', sten: 8, band: 'High' },
                ].map((s) => (
                  <div key={s.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>{s.name}</span>
                      <span className="font-mono font-bold text-teal-700">Sten {s.sten} ({s.band})</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-600 rounded-full"
                        style={{ width: `${s.sten * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-center">
                <button
                  onClick={() => onNavigate('test')}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Generate Your Own Profile →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: DUAL CTA BAND */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-indigo-900 rounded-3xl p-8 sm:p-12 text-white text-center space-y-6 shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-bold font-heading">
            Ready to Discover Your 16 Personality Factors?
          </h2>
          <p className="text-sm sm:text-base text-teal-100 max-w-2xl mx-auto leading-relaxed">
            Take the free, confidential 20-minute assessment today and receive your complete dimensional profile with standardized Sten scores.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('test')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-teal-900 font-bold text-sm shadow-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Start Free Assessment Now
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-teal-900/50 hover:bg-teal-900/80 text-white font-semibold text-sm border border-teal-400/30 transition-colors cursor-pointer"
            >
              Contact Advisory Team
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 8: 60-DAY TRANSFORMATION CHALLENGES (Sonic STI + Transcendental TTI) */}
      <ChallengeSection />
    </div>
  );
};
