import React, { useState } from 'react';
import {
  Volume2,
  Sparkles,
  Waves,
  Heart,
  Moon,
  Sun,
  Activity,
  CheckCircle2,
  ArrowRight,
  Music,
  Disc,
  Headphones,
  Check,
  Send,
  X,
  ShieldCheck,
  Award
} from 'lucide-react';
import { storage } from '../../services/storageService';
import { SonicRegistration, SonicTherapyFormat } from '../../types';

export const SonicTherapeuticSection: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<SonicTherapyFormat>('sound-bath-circle');

  // Registration form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState<number | ''>(28);
  const [city, setCity] = useState('');
  const [sessionPreference, setSessionPreference] = useState<'in-person' | 'live-online' | 'recorded-frequency-suite'>('live-online');
  const [primaryFocus, setPrimaryFocus] = useState<string[]>([
    'Anxiety & Stress Dissolution',
    'Sleep & Insomnia Recovery',
  ]);
  const [specialNotes, setSpecialNotes] = useState('');
  const [registeredResult, setRegisteredResult] = useState<SonicRegistration | null>(null);

  const toggleFocus = (item: string) => {
    if (primaryFocus.includes(item)) {
      setPrimaryFocus(primaryFocus.filter((f) => f !== item));
    } else {
      setPrimaryFocus([...primaryFocus, item]);
    }
  };

  const handleOpenModal = (format: SonicTherapyFormat) => {
    setSelectedFormat(format);
    setRegisteredResult(null);
    setModalOpen(true);
  };

  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) return;

    const newReg = storage.addSonicRegistration({
      name,
      email,
      phone,
      age: typeof age === 'number' ? age : undefined,
      city,
      therapyFormat: selectedFormat,
      sessionPreference,
      primaryFocus,
      specialNotes: specialNotes.trim() || 'Nervous system relaxation and harmonic frequency alignment.',
    });

    setRegisteredResult(newReg);
  };

  return (
    <section id="sonic-therapy" className="relative overflow-hidden py-20 bg-gradient-to-b from-indigo-950 via-slate-900 to-[#101726] text-white border-t border-indigo-800/50">
      {/* Abstract Acoustic Wave Glow Background */}
      <div className="absolute top-0 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* SECTION HEADER */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/15 border border-teal-400/30 text-teal-300 text-xs font-bold tracking-wider uppercase shadow-xs">
            <Volume2 className="w-4 h-4 text-teal-400 animate-pulse" />
            <span>Acoustic Medicine & Frequency Healing</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white font-heading">
            Sonic <span className="bg-gradient-to-r from-teal-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">Therapeutic Intervention</span>
          </h2>

          <div className="inline-block px-5 py-2 bg-gradient-to-r from-teal-600 to-indigo-600 text-white rounded-2xl shadow-md font-bold text-sm tracking-wide uppercase">
            Harmonizing Mind, Body & Cellular Resonance
          </div>

          <p className="text-xs sm:text-sm font-semibold tracking-widest text-teal-200/80 uppercase pt-1 font-mono">
            RESONATE • DISSOLVE • REALIGN • RESTORE • TRANSCEND
          </p>
        </div>

        {/* HERO POSTER & INSPIRATIONAL COPY */}
        <div className="bg-slate-900/90 rounded-3xl border border-indigo-500/30 shadow-2xl overflow-hidden backdrop-blur-md">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Visual Acoustic Artwork Poster (Left Column) */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#0c1322] via-[#131b2e] to-[#0a1826] p-7 sm:p-9 flex flex-col justify-between relative overflow-hidden border-b lg:border-b-0 lg:border-r border-indigo-800/40">
              {/* Concentric Frequency Circles */}
              <div className="absolute -right-12 -top-12 w-64 h-64 border border-teal-500/20 rounded-full animate-ping duration-3000 pointer-events-none" />
              <div className="absolute -right-20 -top-20 w-80 h-80 border border-indigo-400/20 rounded-full pointer-events-none" />

              {/* Top Badge & Header */}
              <div className="space-y-5 relative z-10">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-500/20 text-teal-300 text-xs font-bold uppercase tracking-wider border border-teal-400/30">
                    <Waves className="w-3.5 h-3.5 text-teal-400" />
                    <span>Sonic Therapeutic Intervention</span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500/30">
                    432Hz · 528Hz
                  </span>
                </div>

                {/* Poster Graphic Art Illustration */}
                <div className="relative rounded-2xl bg-gradient-to-b from-indigo-950/90 to-slate-950 p-5 border border-indigo-500/30 shadow-inner overflow-hidden text-center space-y-3">
                  {/* Decorative sound radiating waves SVG */}
                  <div className="relative mx-auto w-32 h-24 flex items-center justify-center">
                    <svg className="w-full h-full text-teal-400/40" viewBox="0 0 200 120" fill="none">
                      {/* Ripple waves */}
                      <circle cx="100" cy="80" r="70" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" className="animate-pulse" />
                      <circle cx="100" cy="80" r="50" stroke="currentColor" strokeWidth="2" opacity="0.6" />
                      <circle cx="100" cy="80" r="30" stroke="#38bdf8" strokeWidth="2.5" opacity="0.8" />
                      {/* Tibetan Singing Bowl Graphic */}
                      <path d="M60 75 C60 105, 140 105, 140 75 Z" fill="url(#bowlGrad)" stroke="#fbbf24" strokeWidth="2" />
                      <ellipse cx="100" cy="75" rx="40" ry="7" fill="#d97706" stroke="#fef08a" strokeWidth="1.5" />
                      <path d="M85 102 L115 102 L110 108 L90 108 Z" fill="#92400e" />
                      <defs>
                        <linearGradient id="bowlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f59e0b" />
                          <stop offset="50%" stopColor="#d97706" />
                          <stop offset="100%" stopColor="#78350f" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-teal-300 font-mono">
                      Pure Acoustic Resonance
                    </span>
                    <h4 className="text-base font-bold text-white font-heading">
                      Harmonic Frequency Medicine
                    </h4>
                  </div>

                  {/* Frequency Spectrum Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-800/90 text-teal-300 border border-teal-500/30">432Hz Deep Calm</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800/90 text-sky-300 border border-sky-500/30">528Hz Cellular Reset</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800/90 text-amber-300 border border-amber-500/30">639Hz Vagal Tone</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-white leading-tight">
                    When Words Fail, <br />
                    <span className="text-teal-400">Frequencies Heal.</span>
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sound is not merely heard; it is felt at the cellular level. When pure acoustic vibrations permeate the body, they downregulate the sympathetic nervous system and recalibrate brainwaves from hyperactive Beta states into deep, restorative Theta and Delta frequencies.
                  </p>
                </div>

                {/* Acoustic Contrast Chips */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-rose-400 tracking-wider">Before Sonic Immersion</span>
                    <p className="text-slate-300 text-[11px]">Cortisol spikes, racing thoughts, muscle tightness, shallow breathing, restless sleep.</p>
                  </div>

                  <div className="p-3 bg-teal-950/60 rounded-xl border border-teal-500/40 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-teal-300 tracking-wider">After Sonic Realignment</span>
                    <p className="text-teal-100 text-[11px]">Deep parasympathetic vagal release, cellular peace, mental silence, euphoric clarity.</p>
                  </div>
                </div>
              </div>

              <div className="pt-5 mt-4 border-t border-indigo-800/50 flex items-center justify-between text-xs text-teal-300 font-mono">
                <span>"Sound is the medicine of the future."</span>
                <Sparkles className="w-4 h-4 text-teal-400" />
              </div>
            </div>

            {/* Program Details & Overview (Right Column) */}
            <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-400/30">
                  <Headphones className="w-3.5 h-3.5" />
                  <span>Therapeutic Modality Overview</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-white font-heading">
                  Ancient Sound Wisdom Meets Modern Neuro-Acoustics
                </h3>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Our Sonic Therapeutic Intervention combines clinical frequency entrainment, Tibetan singing bowl acoustics, planetary gongs, and targeted binaural soundscapes to dissolve somatic stress blocks and awaken higher states of consciousness.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {[
                    { title: 'Neuro-Vagal Tone Reset', desc: 'Stimulates the auricular branch of the vagus nerve, dropping heart rate variability into optimal healing ranges.' },
                    { title: 'Brainwave Synchronization', desc: 'Gently transitions brain rhythms into 4–8Hz Theta states where deep subconscious emotional integration happens.' },
                    { title: 'Cellular Frequency Alignment', desc: 'Vibrational resonance massages somatic tissues, releasing muscular armoring and chronic exhaustion.' },
                    { title: 'Guided Somatic Breath & Tone', desc: 'Vocal resonance and harmonic sound baths to open energy channels and elevate mood.' },
                  ].map((feat, i) => (
                    <div key={i} className="p-3.5 rounded-2xl bg-slate-800/80 border border-indigo-500/30 space-y-1">
                      <h4 className="text-xs font-bold text-teal-300 font-heading flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
                        <span>{feat.title}</span>
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-snug">{feat.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
                <div>
                  <span className="text-xs font-bold text-white block font-heading">Live Circles & Clinical 1-on-1 Sessions</span>
                  <span className="text-[11px] text-slate-400">Available In-Person, Live Online, and Audio Suites</span>
                </div>

                <button
                  onClick={() => handleOpenModal('sound-bath-circle')}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Book Sonic Therapy Session</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4 SONIC PILLARS */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">
              Therapeutic Science
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white font-heading">
              Four Pillars of Sonic Therapeutic Intervention
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-slate-900/80 rounded-3xl p-6 border border-teal-500/30 shadow-xs flex flex-col items-center text-center space-y-4 hover:border-teal-400 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-400/40 text-teal-300 flex items-center justify-center">
                <Waves className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white font-heading">
                Cellular Resonance
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                432Hz harmonic tunings penetrate deep tissue layers, harmonizing water molecules and restoring cellular vitality.
              </p>
            </div>

            <div className="bg-slate-900/80 rounded-3xl p-6 border border-sky-500/30 shadow-xs flex flex-col items-center text-center space-y-4 hover:border-sky-400 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center">
                <Heart className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white font-heading">
                Neuro-Vagal Reset
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Downregulates autonomic stress pathways, releasing tension stored in the chest, gut, and jaw within minutes.
              </p>
            </div>

            <div className="bg-slate-900/80 rounded-3xl p-6 border border-purple-500/30 shadow-xs flex flex-col items-center text-center space-y-4 hover:border-purple-400 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/40 text-purple-300 flex items-center justify-center">
                <Moon className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white font-heading">
                Theta Wave Entrainment
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Binaural frequencies soothe racing mental chatter, creating effortless tranquility and deep restorative sleep.
              </p>
            </div>

            <div className="bg-slate-900/80 rounded-3xl p-6 border border-indigo-500/30 shadow-xs flex flex-col items-center text-center space-y-4 hover:border-indigo-400 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 flex items-center justify-center">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-white font-heading">
                Spiritual Transcendence
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Transcend cognitive fatigue and elevate consciousness with acoustic soundscapes that connect you to inner peace.
              </p>
            </div>
          </div>
        </div>

        {/* 3 SONIC THERAPY TRACKS */}
        <div className="space-y-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider font-mono">
              Available Formats
            </span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white font-heading">
              Choose Your Sonic Healing Format
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Format 1 */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-teal-500/40 shadow-md flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-teal-300 bg-teal-950/80 px-2.5 py-1 rounded-full uppercase tracking-wider border border-teal-400/30">
                    Group Immersion
                  </span>
                  <span className="text-xs font-mono text-slate-400">Weekly 60-min</span>
                </div>
                <h4 className="text-lg font-bold text-white font-heading">
                  Weekly Sound Bath & Meditative Journey
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Immerse in live Tibetan singing bowls, ocean drums, and gong soundscapes to wash away the week’s accumulated stress.
                </p>
                <ul className="space-y-2 text-xs text-slate-300 pt-1">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-400" />
                    <span>Live online circle & in-person hubs</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-teal-400" />
                    <span>Guided relaxation & somatic body scan</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenModal('sound-bath-circle')}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Join Sound Bath Circle
              </button>
            </div>

            {/* Format 2 */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border-2 border-indigo-400 shadow-md flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-300 bg-indigo-950/80 px-2.5 py-1 rounded-full uppercase tracking-wider border border-indigo-400/30">
                    Clinical 1-on-1
                  </span>
                  <span className="text-xs font-mono text-slate-400">Personalized</span>
                </div>
                <h4 className="text-lg font-bold text-white font-heading">
                  1-on-1 Sonic Bio-Resonance Therapy
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Targeted frequency therapy customized to your specific psychological and nervous system needs (anxiety, chronic insomnia, trauma release).
                </p>
                <ul className="space-y-2 text-xs text-slate-300 pt-1">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-400" />
                    <span>Vocal tone & Solfeggio bio-feedback</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-400" />
                    <span>Personalized take-home frequency audio</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenModal('one-on-one-clinical')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Book 1-on-1 Session
              </button>
            </div>

            {/* Format 3 */}
            <div className="bg-slate-900/90 rounded-3xl p-6 border border-purple-500/40 shadow-md flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-300 bg-purple-950/80 px-2.5 py-1 rounded-full uppercase tracking-wider border border-purple-400/30">
                    Audio Protocol
                  </span>
                  <span className="text-xs font-mono text-slate-400">21 Days</span>
                </div>
                <h4 className="text-lg font-bold text-white font-heading">
                  21-Day Daily Sonic Reset Protocol
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Daily 15-minute morning attunement suites and evening Delta wave tracks to rewire sleep hygiene and mental focus.
                </p>
                <ul className="space-y-2 text-xs text-slate-300 pt-1">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-400" />
                    <span>High-fidelity lossless binaural audio</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-400" />
                    <span>Daily listening tracker & guidance</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleOpenModal('21-day-reset-protocol')}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Enroll in 21-Day Protocol
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in-50">
          <div className="bg-slate-900 text-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-teal-500/40 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            {!registeredResult ? (
              <div className="space-y-6">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-teal-400 uppercase tracking-wider bg-teal-950 px-2.5 py-0.5 rounded border border-teal-500/30">
                    Sonic Therapeutic Intervention Intake
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold font-heading text-white">
                    {selectedFormat === 'sound-bath-circle'
                      ? 'Weekly Sound Bath Immersion'
                      : selectedFormat === 'one-on-one-clinical'
                      ? '1-on-1 Sonic Bio-Resonance Therapy'
                      : '21-Day Daily Sonic Reset Protocol'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Register to experience acoustic frequency healing. Free consultation & circle access.
                  </p>
                </div>

                <form onSubmit={handleSubmitRegistration} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                        Full Name <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Maya Lin"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                        Email Address <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="you@domain.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                        Phone / WhatsApp <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+1 / +91 ..."
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                        Age
                      </label>
                      <input
                        type="number"
                        min={14}
                        max={90}
                        value={age}
                        onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : '')}
                        className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Pune, SF..."
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                      Session Preference
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'live-online', label: '🎧 Live Online Circle' },
                        { id: 'in-person', label: '🏛️ In-Person Sound Hub' },
                        { id: 'recorded-frequency-suite', label: '📱 Audio Suite Only' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSessionPreference(p.id as any)}
                          className={`py-2 px-1 text-center text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                            sessionPreference === p.id
                              ? 'bg-teal-600 text-white border-teal-400 font-bold'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                      Primary Healing Focus Areas (Select all that apply)
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      {[
                        'Anxiety & Stress Dissolution',
                        'Sleep & Insomnia Recovery',
                        'Trauma & Somatic Release',
                        'Deep Focus & Neuro-Clarity',
                        'Vagus Nerve Downregulation',
                        'Spiritual Meditation & Peace',
                      ].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleFocus(item)}
                          className={`py-1.5 px-2.5 text-left rounded-lg border text-[11px] font-medium transition-all flex items-center justify-between ${
                            primaryFocus.includes(item)
                              ? 'bg-teal-900/80 text-teal-200 border-teal-400 font-bold'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <span>{item}</span>
                          {primaryFocus.includes(item) && <Check className="w-3.5 h-3.5 text-teal-400" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">
                      Special Notes or Sensitivities
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Any sound sensitivities, specific tinnitus, or focus areas you wish our practitioner to know..."
                      value={specialNotes}
                      onChange={(e) => setSpecialNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Confirm Sonic Therapy Intake</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-teal-900/80 text-teal-300 mx-auto flex items-center justify-center border border-teal-500/40">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-bold font-heading text-white">
                    Sonic Registration Received!
                  </h3>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto">
                    Welcome, <strong>{registeredResult.name}</strong>. Your sound frequency intake record is confirmed.
                  </p>
                </div>

                <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 text-xs font-mono space-y-1 max-w-xs mx-auto">
                  <span className="text-slate-400 block">Booking Reference</span>
                  <span className="text-lg font-bold text-teal-300">{registeredResult.referenceCode}</span>
                  <span className="text-[10px] text-slate-400 block pt-1 uppercase">
                    Preference: {registeredResult.sessionPreference}
                  </span>
                </div>

                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Our acoustic healing facilitator will send your access links, preparation guide, and frequency schedule via WhatsApp & Email.
                </p>

                <button
                  onClick={() => setModalOpen(false)}
                  className="px-6 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
