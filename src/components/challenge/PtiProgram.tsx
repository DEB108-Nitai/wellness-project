import React from 'react';
import { ArrowRight, BookOpen, Brain, Compass, Gem, Library, Lightbulb, Repeat, ShieldCheck, Sparkles, Users, Waves } from 'lucide-react';
import { ProgramPhoto } from './ProgramPhoto';

/**
 * Program 02 — Philosophical Therapeutic Intervention (copy approved by the owner on 2026-10-05).
 * Layout mirrors TTI (header → introduction card → four pillars) in a calm lavender / sky palette.
 */
export const PtiProgram: React.FC<{ onRegister: () => void }> = ({ onRegister }) => (
  <div id="philosophical-intervention" className="bg-white rounded-3xl border border-indigo-100 shadow-xl overflow-hidden">
    <div className="p-6 sm:p-10 lg:p-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-100 pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-bold uppercase tracking-wider border border-indigo-200">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>Program 02 · 60 Days Challenge</span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 font-heading">Philosophical Therapeutic Intervention (PTI)</h3>
          <p className="text-sm sm:text-base italic text-slate-600">“Fix the thought. The habit fixes itself.”</p>
          <p className="text-[11px] sm:text-xs font-bold tracking-widest text-slate-500 uppercase">
            Bhagavad Gita As It Is • Srimad Bhagavatam • Chaitanya Caritamrita
          </p>
        </div>
        <span className="shrink-0 self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 text-white font-bold text-xs shadow-xs uppercase flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> 60-Day Mindset Upgrade
        </span>
      </div>

      {/* Introduction card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch rounded-2xl overflow-hidden border border-indigo-100 shadow-md">
        {/* Left: photo + the big questions */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 flex flex-col gap-5">
          <div className="inline-flex self-start items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-200 text-xs font-bold uppercase tracking-wider border border-indigo-400/30">
            <Compass className="w-3.5 h-3.5" />
            <span>The Questions We Explore</span>
          </div>

          <ProgramPhoto program="pti" fill>
            <p className="text-sm font-semibold text-white">Fix the thought. The habit fixes itself.</p>
          </ProgramPhoto>

          <div className="space-y-2.5">
            {[
              { icon: Brain, q: 'Who am I, really?', a: 'More than your job, your feed or your mistakes.' },
              { icon: Repeat, q: 'Why am I never satisfied?', a: 'The real reason the next thing never feels like enough.' },
              { icon: Waves, q: "How do I stay calm when life isn't?", a: 'Steady under pressure — every time.' },
            ].map(({ icon: Icon, q, a }) => (
              <div key={q} className="flex gap-3 p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="w-8 h-8 shrink-0 rounded-lg bg-indigo-400/15 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-indigo-200" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{q}</p>
                  <p className="text-xs text-slate-300 leading-snug">{a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: description + registration */}
        <div className="lg:col-span-7 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/70 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-800 text-xs font-bold uppercase tracking-wider border border-indigo-200">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Open to Everyone · No Experience Needed</span>
            </div>

            <h4 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading leading-tight">
              Your Mind Runs on Old Code. <span className="text-indigo-600">Time for an Upgrade.</span>
            </h4>

            <p className="text-sm text-slate-600 leading-relaxed">
              Your habits run on your beliefs — about who you are, what will make you happy and what success really means. PTI is a guided,
              discussion-based journey through classical Indian philosophy — some of the oldest and deepest thinking on the human mind — built
              around the questions you actually ask:{' '}
              <strong className="text-slate-800">Who am I, really? Why am I never satisfied? How do I stay calm when life doesn't go my way?</strong>
            </p>

            {/* What we study */}
            <div className="p-4 sm:p-5 rounded-xl bg-indigo-50/70 border border-indigo-100 space-y-3">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-700">
                <Library className="w-4 h-4" /> What We Study Together
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                Over 60 days we read, reflect on and discuss some of the most profound wisdom ever written — the{' '}
                <strong className="text-slate-800">Bhagavad Gita As It Is</strong>, the <strong className="text-slate-800">Srimad Bhagavatam</strong> and
                the <strong className="text-slate-800">Chaitanya Caritamrita</strong>, together with other timeless Vedic scriptures. Each session
                explores a few verses at a time, connects them to the choices you face every day, and leaves plenty of room for your questions.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Bhagavad Gita As It Is', 'Srimad Bhagavatam', 'Chaitanya Caritamrita', 'Other Vedic Scriptures'].map((book) => (
                  <span key={book} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-100 text-[11px] font-semibold text-indigo-800">
                    <BookOpen className="w-3 h-3 text-indigo-400" /> {book}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 p-4 rounded-xl bg-white border border-indigo-100 shadow-2xs">
              <span className="w-9 h-9 shrink-0 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center">
                <Lightbulb className="w-4.5 h-4.5 text-amber-500" />
              </span>
              <p className="text-sm text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-900">Why it works · </span>
                Modern cognitive psychology rests on an idea ancient philosophers taught long ago:{' '}
                <strong className="text-slate-800">it isn't events that shape us, but how we interpret them.</strong> Change the thinking, and you
                change the feelings and the actions that follow.
              </p>
            </div>
          </div>

          {/* Register bar */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-indigo-100">
            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed text-center sm:text-left">
              Bite-sized readings · Live discussion circles · Real-life challenges · Zero experience needed — every question welcome.
            </p>
            <button
              onClick={onRegister}
              className="w-full sm:w-auto shrink-0 px-6 py-3 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Start the PTI Challenge (Free)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Four pillars */}
      <div className="space-y-6 pt-4">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">The Four Shifts</span>
          <h4 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">Four Pillars of Philosophical Transformation</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { icon: Brain, title: 'Rewire Your Thinking', desc: 'Spot the hidden beliefs running your decisions.', tint: 'indigo' },
            { icon: ShieldCheck, title: 'Own Your Impulses', desc: 'Real tools for desire, anger and distraction — not just willpower.', tint: 'sky' },
            { icon: Waves, title: 'Perform Without Pressure', desc: 'Give 100% without being crushed by the outcome.', tint: 'violet' },
            { icon: Gem, title: 'Choose Deep Over Cheap', desc: 'Trade quick dopamine for happiness that actually lasts.', tint: 'teal' },
          ].map(({ icon: Icon, title, desc, tint }) => (
            <div
              key={title}
              className={`bg-white rounded-2xl p-5 border shadow-2xs flex flex-col items-center text-center space-y-3 hover:shadow-md transition-all ${PILLAR_TINTS[tint].card}`}
            >
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-inner ${PILLAR_TINTS[tint].icon}`}>
                <Icon className="w-7 h-7" />
              </div>
              <h5 className="text-sm font-bold text-slate-900 font-heading">{title}</h5>
              <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const PILLAR_TINTS: Record<string, { card: string; icon: string }> = {
  indigo: { card: 'border-indigo-100', icon: 'bg-indigo-50 border-indigo-100 text-indigo-600' },
  sky: { card: 'border-sky-100', icon: 'bg-sky-50 border-sky-100 text-sky-600' },
  violet: { card: 'border-violet-100', icon: 'bg-violet-50 border-violet-100 text-violet-600' },
  teal: { card: 'border-teal-100', icon: 'bg-teal-50 border-teal-100 text-teal-600' },
};
