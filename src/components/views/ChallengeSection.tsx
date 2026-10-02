import React, { useState } from 'react';
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
import { storage } from '../../services/storageService';
import { ChallengeRegistration, ChallengeTrack } from '../../types';

export const ChallengeSection: React.FC = () => {
  // Active Program Tab ('all' | 'sti' | 'tti')
  const [activeTab, setActiveTab] = useState<'both' | 'sti' | 'tti'>('both');

  // Modal registration state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<'sti' | 'tti'>('sti');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState<number | ''>(26);
  const [city, setCity] = useState('');
  const [cohortTiming, setCohortTiming] = useState<'morning' | 'evening' | 'weekend'>('morning');
  const [struggles, setStruggles] = useState<string[]>([
    'Overthinking & Procrastination',
    'Screen Addiction / Doomscrolling',
    'Stress & Anxiety',
  ]);
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [registeredResult, setRegisteredResult] = useState<any | null>(null);

  const toggleStruggle = (item: string) => {
    if (struggles.includes(item)) {
      setStruggles(struggles.filter((s) => s !== item));
    } else {
      setStruggles([...struggles, item]);
    }
  };

  const handleOpenModal = (program: 'sti' | 'tti') => {
    setSelectedProgram(program);
    setRegisteredResult(null);
    setModalOpen(true);
  };

  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) return;

    if (selectedProgram === 'sti') {
      const newReg = storage.addSonicRegistration({
        name,
        email,
        phone,
        age: typeof age === 'number' ? age : undefined,
        city,
        therapyFormat: 'sound-bath-circle',
        sessionPreference: 'live-online',
        primaryFocus: struggles,
        specialNotes: primaryGoal.trim() || '60 Days Sonic Therapeutic Intervention Challenge Registration.',
      });
      setRegisteredResult(newReg);
    } else {
      const newReg = storage.addChallengeRegistration({
        name,
        email,
        phone,
        age: typeof age === 'number' ? age : undefined,
        city,
        programTrack: 'tti-intensive',
        cohortTiming,
        currentStruggles: struggles,
        primaryGoal: primaryGoal.trim() || '60 Days Transcendental Therapeutic Intervention Challenge Registration.',
      });
      setRegisteredResult(newReg);
    }
  };

  return (
    <section id="60-days-challenge" className="relative overflow-hidden py-20 bg-gradient-to-b from-[#FAF8F5] via-amber-50/30 to-white border-t border-amber-200/60">
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
            Our Two 60-Day <span className="bg-gradient-to-r from-teal-700 via-indigo-700 to-amber-700 bg-clip-text text-transparent">Transformation Challenges</span>
          </h2>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
            Break the stagnation loop, master your mind, elevate consciousness, and awaken true potential through our two proven 60-day scientific & spiritual methodologies.
          </p>

          {/* Program Toggle Filter */}
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              onClick={() => setActiveTab('both')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === 'both'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              All 60-Day Programs (2)
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
              <span>1. Sonic Intervention (STI)</span>
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
              <span>2. Transcendental (TTI)</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* PROGRAM 1: SONIC THERAPEUTIC INTERVENTION (STI) - 60 DAYS CHALLENGE */}
        {/* ========================================================================= */}
        {(activeTab === 'both' || activeTab === 'sti') && (
          <div id="sonic-therapy" className="bg-gradient-to-b from-[#0e1626] via-[#121c33] to-[#091122] rounded-3xl border border-teal-500/30 text-white shadow-2xl overflow-hidden">
            <div className="p-6 sm:p-10 lg:p-12 space-y-10">
              {/* Program Header Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/50 pb-6">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider border border-teal-400/30">
                    <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>Program 01 · 60 Days Challenge</span>
                  </div>
                  <h3 className="text-2xl sm:text-4xl font-black text-white font-heading">
                    Sonic Therapeutic Intervention
                  </h3>
                  <p className="text-xs sm:text-sm text-teal-200/90 font-mono">
                    "Don’t Bloop, get out of the loop • Elevate Your Consciousness, Uplift Your Modes"
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-bold text-xs">
                    60-Day Sacred Sound Immersion
                  </span>
                </div>
              </div>

              {/* Side-by-Side: Poster Artwork + Inspiring Copy & Direct Registration */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Left Side: High Fidelity Poster Representation */}
                <div className="lg:col-span-5 bg-gradient-to-b from-[#162238] to-[#0b1322] rounded-2xl p-6 sm:p-8 border border-teal-500/30 shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden">
                  <div className="space-y-4 relative z-10">
                    {/* Poster Top Wordmark & Header */}
                    <div className="text-center space-y-2 pb-4 border-b border-indigo-800/40">
                      <div className="inline-flex items-center justify-center gap-2 text-teal-300 font-bold text-lg font-heading tracking-tight">
                        <Waves className="w-5 h-5 text-teal-400 animate-pulse" />
                        <span>Sonic Therapeutic Intervention</span>
                      </div>
                      <div className="inline-block px-4 py-1 rounded-full bg-rose-600/30 border border-rose-500/40 text-rose-200 text-xs font-bold tracking-wider uppercase">
                        60 Days Challenge
                      </div>
                    </div>

                    {/* Sacred Four Steps from Poster */}
                    <div className="grid grid-cols-4 gap-1.5 py-2 text-center text-[10px] font-bold uppercase">
                      {[
                        { icon: '🎧', label: 'Chant' },
                        { icon: '🪷', label: 'Focus' },
                        { icon: '🤍', label: 'Balance' },
                        { icon: '🌱', label: 'Transform' },
                      ].map((item) => (
                        <div key={item.label} className="p-2 rounded-xl bg-slate-800/80 border border-teal-500/20 space-y-1">
                          <span className="text-base">{item.icon}</span>
                          <span className="block text-teal-200">{item.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Altar & Sound Meditation Theme Graphic */}
                    <div className="rounded-2xl bg-gradient-to-b from-indigo-950 to-slate-950 p-5 border border-amber-500/30 text-center space-y-3 relative overflow-hidden">
                      <div className="space-y-1">
                        <span className="text-amber-300 font-bold text-sm tracking-wide block">
                          "A Calmer Mind, A Brighter You"
                        </span>
                        <p className="text-xs text-slate-300 font-serif italic">
                          "Hare Krishna Hare Krishna Krishna Krishna Hare Hare <br />
                          Hare Rama Hare Rama Rama Rama Hare Hare"
                        </p>
                      </div>

                      {/* Sacred Books & Practice */}
                      <div className="grid grid-cols-3 gap-1.5 pt-2 text-[10px] font-medium text-amber-200/90 font-mono">
                        <div className="p-1.5 bg-amber-950/60 rounded-lg border border-amber-600/30">
                          Srimad Bhagavatam
                        </div>
                        <div className="p-1.5 bg-amber-950/60 rounded-lg border border-amber-600/30">
                          Chaitanya Charitamrita
                        </div>
                        <div className="p-1.5 bg-amber-950/60 rounded-lg border border-amber-600/30">
                          Bhagavad Gita
                        </div>
                      </div>
                    </div>

                    {/* Poster Tagline */}
                    <div className="text-center pt-1">
                      <span className="text-xs font-mono text-teal-300">
                        Chant • Reflect • Progress
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-indigo-800/50 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Acoustic Frequency Healing</span>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </div>
                </div>

                {/* Right Side: Inspiring Text & Direct Registration Form */}
                <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <h4 className="text-xl sm:text-2xl font-bold text-white font-heading">
                      Harmonize Mind & Body Through 60 Days of Sacred Sound Therapy
                    </h4>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      The modern lifestyle traps our consciousness in hyperactive, anxious loops. Sonic Therapeutic Intervention (STI) utilizes the highest spiritual sound vibration (Maha-Mantra resonance), sacred Vedic literature, and calibrated acoustic entrainment to systematically clear mental debris, downregulate autonomic stress, and cultivate lasting inner peace.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {[
                        { title: 'Chant & Recalibrate', desc: 'Daily mantra acoustic resonance to clear subconscious clutter.' },
                        { title: 'Elevate Consciousness', desc: 'Shift from lower modes of anxiety & inertia to Sattva (clarity & wisdom).' },
                        { title: 'Vagal Downregulation', desc: 'Restore restful sleep, calm heart rate variability, and somatic peace.' },
                        { title: 'Daily Mentorship & Circles', desc: 'Guided community discourse on Bhagavad Gita & spiritual life science.' },
                      ].map((item, i) => (
                        <div key={i} className="p-3.5 rounded-2xl bg-slate-800/80 border border-teal-500/20 space-y-1">
                          <h5 className="text-xs font-bold text-teal-300 font-heading flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                            <span>{item.title}</span>
                          </h5>
                          <p className="text-[11px] text-slate-300 leading-snug">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Direct 60-Day Challenge Registration Form */}
                  <div className="bg-slate-900/90 rounded-2xl p-5 sm:p-6 border border-teal-500/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h5 className="text-sm font-bold text-white font-heading">
                          Register for 60-Day Sonic Challenge (STI)
                        </h5>
                        <p className="text-[11px] text-slate-400">
                          Free intake & daily guided schedule. Receive orientation details instantly.
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenModal('sti')}
                        className="px-4 py-2 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>Join STI Challenge</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PROGRAM 2: TRANSCENDENTAL THERAPEUTIC INTERVENTION (TTI) - 60 DAYS CHALLENGE */}
        {/* ========================================================================= */}
        {(activeTab === 'both' || activeTab === 'tti') && (
          <div className="bg-white rounded-3xl border border-amber-200/90 shadow-xl overflow-hidden space-y-8">
            <div className="p-6 sm:p-10 lg:p-12 space-y-10">
              {/* Program Header Badge */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-100 pb-6">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold uppercase tracking-wider border border-amber-300">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Program 02 · 60 Days Challenge</span>
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
                <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
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
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/80 border border-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                          <span className="truncate">{item}</span>
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
                  <div className="space-y-4">
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
                        <div key={i} className="p-3 rounded-xl bg-white border border-amber-200/60 shadow-2xs space-y-1">
                          <h5 className="text-xs font-bold text-slate-900 font-heading flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-teal-600" />
                            <span>{feat.label}</span>
                          </h5>
                          <p className="text-[11px] text-slate-500 leading-snug">{feat.desc}</p>
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
                      onClick={() => handleOpenModal('tti')}
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

      {/* ========================================================================= */}
      {/* UNIFIED 60-DAY CHALLENGE REGISTRATION MODAL */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-auto max-h-[92vh] overflow-y-auto overscroll-contain">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {!registeredResult ? (
              <div className="space-y-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wider bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
                      60 Days Challenge Intake
                    </span>
                    <span className="text-xs font-bold text-teal-800 uppercase tracking-wider bg-teal-100 px-2.5 py-0.5 rounded border border-teal-300">
                      {selectedProgram === 'sti' ? 'Sonic Intervention (STI)' : 'Transcendental (TTI)'}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 pt-1">
                    {selectedProgram === 'sti'
                      ? 'Sonic Therapeutic Intervention 60-Day Challenge'
                      : 'Transcendental Therapeutic Intervention 60-Day Challenge'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete your registration to join our upcoming 60-day cohort. No prerequisites required.
                  </p>
                </div>

                {/* Program Track Selector inside Modal */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setSelectedProgram('sti')}
                    className={`py-2 px-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedProgram === 'sti'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Sonic (STI)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProgram('tti')}
                    className={`py-2 px-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      selectedProgram === 'tti'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Transcendental (TTI)</span>
                  </button>
                </div>

                <form onSubmit={handleSubmitRegistration} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Maya Lin"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        Email Address <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="you@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        Phone / WhatsApp <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+1 / +91 ..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        Age
                      </label>
                      <input
                        type="number"
                        min={14}
                        max={90}
                        value={age}
                        onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : '')}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                        City / Country
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Pune, SF"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Preferred Daily Schedule
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'morning', label: '🌅 Morning Track' },
                        { id: 'evening', label: '🌆 Evening Track' },
                        { id: 'weekend', label: '📅 Flexible / Weekend' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setCohortTiming(t.id as any)}
                          className={`py-2 px-1 text-center text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                            cohortTiming === t.id
                              ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold shadow-2xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      Current Struggles / Goals (Select all that apply)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      {[
                        'Overthinking & Procrastination',
                        'Screen Addiction / Doomscrolling',
                        'Stress & Anxiety',
                        'Restless Sleep / Late Nights',
                        'Lack of Spiritual Grounding',
                        'Emotional Reactivity',
                      ].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleStruggle(item)}
                          className={`py-1.5 px-2.5 text-left rounded-lg border text-[11px] font-medium transition-all flex items-center justify-between cursor-pointer ${
                            struggles.includes(item)
                              ? 'bg-teal-50 text-teal-800 border-teal-400 font-bold'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <span>{item}</span>
                          {struggles.includes(item) && <Check className="w-3.5 h-3.5 text-teal-600" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                      What is your #1 Goal for these 60 Days?
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Break compulsive screen habits, build peaceful daily meditation, gain clarity on my career and life purpose..."
                      value={primaryGoal}
                      onChange={(e) => setPrimaryGoal(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-amber-600 via-orange-600 to-teal-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Confirm 60-Day Challenge Registration</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-300">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold font-heading text-slate-900">
                    Registration Confirmed!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto">
                    Welcome to the 60-Day Transformation Challenge, <strong>{registeredResult.name}</strong>.
                  </p>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-mono space-y-1 max-w-xs mx-auto">
                  <span className="text-slate-400 block">Registration Code</span>
                  <span className="text-lg font-bold text-slate-900">{registeredResult.referenceCode}</span>
                  <span className="text-[10px] text-teal-700 font-semibold block pt-1 uppercase">
                    Track: {selectedProgram === 'sti' ? 'Sonic Intervention (STI)' : 'Transcendental (TTI)'}
                  </span>
                </div>

                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Our program facilitators will reach out to you with your starter kit, orientation schedule, and daily practice journal via WhatsApp and Email.
                </p>

                <button
                  onClick={() => setModalOpen(false)}
                  className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close & Return
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
