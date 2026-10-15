import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, BookOpen, Check, CheckCircle2, Compass, Loader2, Send, Volume2, X } from 'lucide-react';
import { ApiError } from '../../api/client';
import { challengeApi, CohortTiming, ProgramCode, PROGRAMS, STRUGGLES } from '../../api/challenge';
import { useAuth } from '../../context/AuthContext';
import { useCountries } from '../../hooks/useCountries';

interface Props {
  initialProgram: ProgramCode;
  onClose: () => void;
}

const PROGRAM_BUTTONS: { code: ProgramCode; icon: React.ElementType; active: string }[] = [
  { code: 'STI', icon: Volume2, active: 'bg-teal-700 text-white shadow-xs' },
  { code: 'PTI', icon: BookOpen, active: 'bg-indigo-600 text-white shadow-xs' },
  { code: 'TTI', icon: Compass, active: 'bg-amber-600 text-white shadow-xs' },
];

// Phones: 44 px tall and 16 px text (smaller text makes iPhones zoom in on focus). Compact on laptops and up.
const input = 'w-full px-3 py-3 lg:py-2 text-base lg:text-xs bg-slate-50 border rounded-xl text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500';

/** One registration form for all three 60-day programs (PRD CH-2 … CH-5). */
export const RegistrationModal: React.FC<Props> = ({ initialProgram, onClose }) => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<ProgramCode[]>([initialProgram]);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const countries = useCountries();
  const [country, setCountry] = useState(''); // chosen by the visitor, never assumed
  const [cohortTiming, setCohortTiming] = useState<CohortTiming>('morning');
  const [struggles, setStruggles] = useState<string[]>([]);
  const [primaryGoal, setPrimaryGoal] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState(''); // honeypot — real people never see or fill it
  const startedAt = useRef(Date.now());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  // Typed something that would be lost? Ask before closing (an accidental Escape or ✕ must not wipe the form).
  const dirty =
    !done &&
    (phone !== '' || age !== '' || city !== '' || struggles.length > 0 || primaryGoal !== '' || consent ||
      name !== (user?.name ?? '') || email !== (user?.email ?? ''));
  const requestClose = useCallback(() => {
    if (!dirty || window.confirm('Discard your registration? What you have typed will be lost.')) onClose();
  }, [dirty, onClose]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  const toggleProgram = (code: ProgramCode) =>
    setPrograms((p) => (p.includes(code) ? p.filter((x) => x !== code) : [...p, code]));

  const toggleStruggle = (item: string) =>
    setStruggles((s) => (s.includes(item) ? s.filter((x) => x !== item) : [...s, item]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const errs: Record<string, string> = {};
    if (programs.length === 0) errs.programs = 'Please choose at least one program.';
    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 18 || ageNum > 100) errs.age = 'Please enter an age between 18 and 100.';
    if (!city.trim()) errs.city = 'Please enter your city.';
    if (!country) errs.country = 'Please choose your country.';
    if (!consent) errs.consent = 'Please accept to continue.';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setSubmitting(true);
    try {
      await challengeApi.register({
        programs: PROGRAM_BUTTONS.map((b) => b.code).filter((c) => programs.includes(c)),
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        age: ageNum,
        city: city.trim(),
        country,
        cohortTiming,
        struggles,
        ...(primaryGoal.trim() ? { primaryGoal: primaryGoal.trim() } : {}),
        consent,
        website,
        formElapsedMs: Date.now() - startedAt.current,
      });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) {
        setFieldErrors(err.fields);
        setError('Please check the highlighted fields.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const fieldError = (key: string) => (fieldErrors[key] ? <p className="mt-1 text-[11px] text-rose-600">{fieldErrors[key]}</p> : null);
  const border = (key: string) => (fieldErrors[key] ? 'border-rose-400' : 'border-slate-300');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="registration-title"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative my-auto max-h-[92vh] overflow-y-auto overscroll-contain">
        <button onClick={requestClose} className="absolute top-3 right-3 lg:top-5 lg:right-5 p-3 lg:p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer" aria-label="Close">
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <div className="py-10 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center border border-emerald-300">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 id="registration-title" className="text-2xl font-bold font-heading text-slate-900">
              Registered successfully
            </h3>
            <button onClick={onClose} className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer">
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
                  60 Days Challenge Intake
                </span>
              </div>
              <h3 id="registration-title" className="text-xl sm:text-2xl font-bold font-heading text-slate-900 pt-1">
                60-Day Challenge Registration
              </h3>
              <p className="text-xs text-slate-500">Choose one or more programs, then complete your details. Free — no prerequisites required.</p>
            </div>

            {/* Program choice: tick one or more */}
            <fieldset aria-describedby={fieldErrors.programs ? 'reg-programs-error' : undefined}>
              <legend className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                Programs <span className="text-rose-500">*</span>
              </legend>
              <div className={`grid grid-cols-1 sm:grid-cols-3 gap-1.5 sm:gap-2 p-1 bg-slate-100 rounded-xl ${fieldErrors.programs ? 'ring-1 ring-rose-400' : ''}`}>
                {PROGRAM_BUTTONS.map(({ code, icon: Icon, active }) => {
                  const on = programs.includes(code);
                  return (
                    <label
                      key={code}
                      className={`relative min-h-11 py-2 px-3 sm:px-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-teal-500 ${
                        on ? active : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleProgram(code)} aria-label={PROGRAMS[code].name} />
                      {on ? <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> : <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                      <span>{PROGRAMS[code].short}</span>
                    </label>
                  );
                })}
              </div>
              {fieldErrors.programs && (
                <p id="reg-programs-error" className="mt-1 text-[11px] text-rose-600">
                  {fieldErrors.programs}
                </p>
              )}
            </fieldset>

            <form onSubmit={submit} className="space-y-4" noValidate>
              {/* Honeypot: hidden from people and assistive tech */}
              <div aria-hidden="true" className="absolute -left-[10000px] w-px h-px overflow-hidden">
                <label>
                  Website
                  <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="reg-name" className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input id="reg-name" required autoComplete="name" maxLength={100} placeholder="e.g. Rahul Sharma" value={name} onChange={(e) => setName(e.target.value)} className={`${input} ${border('name')}`} />
                  {fieldError('name')}
                </div>
                <div>
                  <label htmlFor="reg-email" className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input id="reg-email" type="email" required autoComplete="email" placeholder="rahul@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} className={`${input} ${border('email')}`} />
                  {fieldError('email')}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="reg-phone" className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Phone / WhatsApp <span className="text-rose-500">*</span>
                  </label>
                  <input id="reg-phone" type="tel" required autoComplete="tel" maxLength={20} placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${input} font-mono ${border('phone')}`} />
                  {fieldError('phone')}
                </div>
                <div>
                  <label htmlFor="reg-age" className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Age <span className="text-rose-500">*</span>
                  </label>
                  <input id="reg-age" type="number" required inputMode="numeric" min={18} max={100} value={age} onChange={(e) => setAge(e.target.value)} className={`${input} font-mono ${border('age')}`} />
                  {fieldError('age')}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label htmlFor="reg-city" className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input id="reg-city" required autoComplete="address-level2" maxLength={100} placeholder="e.g. Pune" value={city} onChange={(e) => setCity(e.target.value)} className={`${input} ${border('city')}`} />
                  {fieldError('city')}
                </div>
                <div>
                  <label htmlFor="reg-country" className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                    Country <span className="text-rose-500">*</span>
                  </label>
                  <select id="reg-country" required autoComplete="country" value={country} onChange={(e) => setCountry(e.target.value)} className={`${input} ${border('country')}`}>
                    <option value="">Select your country…</option>
                    {countries.list.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {fieldError('country')}
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">Preferred Daily Schedule</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'morning', label: '🌅 Morning Track' },
                    { id: 'evening', label: '🌆 Evening Track' },
                    { id: 'weekend', label: '📅 Flexible / Weekend' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={cohortTiming === t.id}
                      onClick={() => setCohortTiming(t.id as CohortTiming)}
                      className={`min-h-11 lg:min-h-0 py-2 px-1 text-center text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        cohortTiming === t.id ? 'bg-amber-100 text-amber-900 border-amber-400 font-bold shadow-2xs' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">Current Struggles / Goals (Select all that apply)</span>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {STRUGGLES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={struggles.includes(item)}
                      onClick={() => toggleStruggle(item)}
                      className={`min-h-11 lg:min-h-0 py-1.5 px-2.5 text-left rounded-lg border text-[11px] font-medium transition-all flex items-center justify-between gap-1 cursor-pointer ${
                        struggles.includes(item) ? 'bg-teal-50 text-teal-800 border-teal-400 font-bold' : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      <span>{item}</span>
                      {struggles.includes(item) && <Check className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
                    </button>
                  ))}
                </div>
                {fieldError('struggles')}
              </div>

              <div>
                <label htmlFor="reg-goal" className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
                  What is your #1 Goal for these 60 Days?
                </label>
                <textarea
                  id="reg-goal"
                  rows={2}
                  maxLength={1000}
                  placeholder="e.g. Break compulsive screen habits, build a peaceful daily routine, gain clarity on my career and life purpose..."
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  className={`${input} placeholder-slate-400 ${border('primaryGoal')}`}
                />
              </div>

              <label className="flex items-start gap-2.5 text-[11px] text-slate-600 cursor-pointer">
                <input id="reg-consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 w-4 h-4 accent-teal-600" />
                <span>
                  I agree to be contacted about {programs.length > 1 ? 'these programs' : 'this program'} by email or phone, and to the{' '}
                  <Link to="/privacy" target="_blank" className="underline text-teal-700">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
              {fieldError('consent')}

              {error && (
                <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-amber-600 via-orange-600 to-teal-600 hover:opacity-95 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>Confirm 60-Day Challenge Registration</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
