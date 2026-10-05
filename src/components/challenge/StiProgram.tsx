import React from 'react';
import { ArrowRight, Headphones, Heart, Sparkles, Sun, Users, Volume2, Waves } from 'lucide-react';
import { ProgramPhoto } from './ProgramPhoto';

/**
 * Program 01 — Sonic Therapeutic Intervention. Wording is the owner-approved original;
 * layout mirrors TTI (header → introduction card → four pillars) in a calm teal palette.
 */
export const StiProgram: React.FC<{ onRegister: () => void }> = ({ onRegister }) => (
  <div id="sonic-therapy" className="bg-white rounded-3xl border border-teal-200/80 shadow-xl overflow-hidden">
    <div className="p-6 sm:p-10 lg:p-12 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-teal-100 pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider border border-teal-200">
            <Volume2 className="w-3.5 h-3.5 text-teal-600" />
            <span>Program 01 · 60 Days Challenge</span>
          </div>
          <h3 className="text-2xl sm:text-4xl font-black text-slate-900 font-heading">Sonic Therapeutic Intervention (STI)</h3>
          <p className="text-sm sm:text-base italic text-slate-600">“Don’t Bloop, get out of the loop • Elevate Your Consciousness, Uplift Your Modes”</p>
        </div>
        <span className="shrink-0 self-start sm:self-center px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold text-xs shadow-xs uppercase">
          60-Day Sacred Sound Immersion
        </span>
      </div>

      {/* Introduction card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch rounded-2xl overflow-hidden border border-teal-200/80 shadow-md">
        {/* Left: mantra, photo, books */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 flex flex-col gap-6">
          <div className="flex-1 flex flex-col gap-4">
            <div className="inline-flex self-start items-center gap-2 px-3 py-1 rounded-lg bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider border border-teal-500/30">
              <Waves className="w-3.5 h-3.5" />
              <span>60 Days Challenge</span>
            </div>
            <h4 className="text-xl sm:text-2xl font-bold font-heading text-teal-200">A Calmer Mind, A Brighter You</h4>
            <p className="text-sm text-slate-300 font-serif italic leading-relaxed">
              Hare Krishna Hare Krishna Krishna Krishna Hare Hare
              <br />
              Hare Rama Hare Rama Rama Rama Hare Hare
            </p>

            <ProgramPhoto program="sti" fill minHeight="lg:min-h-[170px]" />

            <div className="grid grid-cols-3 gap-2 text-[11px] font-medium text-slate-300">
              {['Srimad Bhagavatam', 'Chaitanya Charitamrita', 'Bhagavad Gita'].map((book) => (
                <div key={book} className="px-2 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-center leading-tight">
                  {book}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700 flex items-center justify-between gap-3 text-xs font-mono">
            <span className="text-teal-300/90">Chant • Reflect • Progress</span>
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          </div>
        </div>

        {/* Right: description + registration */}
        <div className="lg:col-span-7 bg-gradient-to-br from-teal-50/80 via-white to-cyan-50/50 p-6 sm:p-8 flex flex-col justify-between gap-6">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider border border-teal-200">
              <Headphones className="w-3.5 h-3.5 text-teal-600" />
              <span>Acoustic Frequency Healing</span>
            </div>
            <h4 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">Harmonize Mind & Body Through 60 Days of Sacred Sound Therapy</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              The modern lifestyle traps our consciousness in hyperactive, anxious loops. Sonic Therapeutic Intervention (STI) utilizes the highest
              spiritual sound vibration (Maha-Mantra resonance), sacred Vedic literature, and calibrated acoustic entrainment to systematically clear
              mental debris, downregulate autonomic stress, and cultivate lasting inner peace.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { icon: '🎧', label: 'Chant' },
                { icon: '🪷', label: 'Focus' },
                { icon: '🤍', label: 'Balance' },
                { icon: '🌱', label: 'Transform' },
              ].map((item) => (
                <div key={item.label} className="py-3 rounded-xl bg-white border border-teal-100 shadow-2xs text-center space-y-1">
                  <span className="text-lg" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="block text-[11px] font-bold uppercase tracking-wider text-teal-800">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Register bar */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-teal-100">
            <div className="text-center sm:text-left">
              <span className="text-xs font-bold text-slate-900 block font-heading">Register for 60-Day Sonic Challenge (STI)</span>
              <span className="text-[11px] text-slate-500">Free intake & daily guided schedule. Receive orientation details instantly.</span>
            </div>
            <button
              onClick={onRegister}
              className="w-full sm:w-auto shrink-0 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Join STI Challenge</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Four pillars (the four STI benefit boxes) */}
      <div className="space-y-6 pt-4">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">The Four Pillars</span>
          <h4 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">Four Pillars of Sonic Transformation</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { icon: Headphones, title: 'Chant & Recalibrate', desc: 'Daily mantra acoustic resonance to clear subconscious clutter.', tint: 'teal' },
            { icon: Sun, title: 'Elevate Consciousness', desc: 'Shift from lower modes of anxiety & inertia to Sattva (clarity & wisdom).', tint: 'amber' },
            { icon: Heart, title: 'Vagal Downregulation', desc: 'Restore restful sleep, calm heart rate variability, and somatic peace.', tint: 'rose' },
            { icon: Users, title: 'Daily Mentorship & Circles', desc: 'Guided community discourse on Bhagavad Gita & spiritual life science.', tint: 'cyan' },
          ].map(({ icon: Icon, title, desc, tint }) => (
            <div
              key={title}
              className={`bg-white rounded-2xl p-5 border shadow-2xs flex flex-col items-center text-center space-y-3 hover:shadow-md transition-all ${TINTS[tint].card}`}
            >
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center shadow-inner ${TINTS[tint].icon}`}>
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

const TINTS: Record<string, { card: string; icon: string }> = {
  teal: { card: 'border-teal-100', icon: 'bg-teal-50 border-teal-100 text-teal-600' },
  amber: { card: 'border-amber-100', icon: 'bg-amber-50 border-amber-100 text-amber-600' },
  rose: { card: 'border-rose-100', icon: 'bg-rose-50 border-rose-100 text-rose-500' },
  cyan: { card: 'border-cyan-100', icon: 'bg-cyan-50 border-cyan-100 text-cyan-600' },
};
