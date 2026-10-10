import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Demographics, Education, Gender } from '../../api/assessment';
import { COUNTRY_CODES } from '../../data/countries';

interface Props {
  minAge: number;
  defaultNickname: string;
  submitting: boolean;
  error: string | null;
  fieldErrors: Record<string, string>;
  onBack: () => void;
  onSubmit: (data: Demographics) => void;
}

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
  { value: 'self_describe', label: 'Self-describe' },
];

const EDUCATION: { value: Education; label: string }[] = [
  { value: 'high_school', label: 'High school' },
  { value: 'bachelors', label: "Bachelor's degree" },
  { value: 'masters', label: "Master's degree" },
  { value: 'doctorate', label: 'Doctorate / professional' },
  { value: 'other', label: 'Other' },
];

const fieldClass =
  'w-full h-11 px-3.5 bg-white border rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-teal-500/15 focus:border-teal-500';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5';

/** Country names in the visitor's language, sorted; preselects the country from the browser locale. */
function useCountries() {
  return useMemo(() => {
    let names: Intl.DisplayNames | null = null;
    try {
      names = new Intl.DisplayNames([navigator.language, 'en'], { type: 'region' });
    } catch {
      names = null;
    }
    const list = COUNTRY_CODES.map((code) => ({ code, name: names?.of(code) ?? code }));
    list.sort((a, b) => a.name.localeCompare(b.name));
    const guess = navigator.language.split('-')[1]?.toUpperCase() ?? '';
    return { list, guess: (COUNTRY_CODES as readonly string[]).includes(guess) ? guess : '' };
  }, []);
}

/** TEST-2: demographics, validated again on the server. */
export const DemographicsStep: React.FC<Props> = ({ minAge, defaultNickname, submitting, error, fieldErrors, onBack, onSubmit }) => {
  const countries = useCountries();
  const [country, setCountry] = useState(countries.guess);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [genderText, setGenderText] = useState('');
  const [nickname, setNickname] = useState(defaultNickname);
  const [education, setEducation] = useState<Education | ''>('');
  const [occupation, setOccupation] = useState('');
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const errors = { ...fieldErrors, ...localErrors };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const ageNum = Number(age);
    if (!country) errs.country = 'Please choose your country.';
    if (!Number.isInteger(ageNum) || ageNum < minAge || ageNum > 100) errs.age = `Please enter an age between ${minAge} and 100.`;
    if (!gender) errs.gender = 'Please choose an option.';
    if (gender === 'self_describe' && !genderText.trim()) errs.genderText = 'Please describe your gender, or choose another option.';
    setLocalErrors(errs);
    if (Object.keys(errs).length) return;

    onSubmit({
      country,
      age: ageNum,
      gender: gender as Gender,
      ...(gender === 'self_describe' ? { genderText: genderText.trim() } : {}),
      ...(nickname.trim() ? { nickname: nickname.trim() } : {}),
      ...(education ? { education } : {}),
      ...(occupation.trim() ? { occupation: occupation.trim() } : {}),
    });
  };

  const err = (name: string) =>
    errors[name] ? (
      <p className="mt-1 text-xs text-rose-600" role="alert">
        {errors[name]}
      </p>
    ) : null;
  const border = (name: string) => (errors[name] ? 'border-rose-400' : 'border-slate-300');

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
      <div className="text-center space-y-2">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Step 2 of 2 · About you</span>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">A little about you</h1>
        <p className="text-sm text-slate-500">Used only to compare your answers with similar people and for anonymised research.</p>
      </div>

      <form onSubmit={submit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="country" className={labelClass}>
            Country of residence <span className="text-rose-500">*</span>
          </label>
          <select id="country" value={country} onChange={(e) => setCountry(e.target.value)} className={`${fieldClass} ${border('country')}`}>
            <option value="">Select your country…</option>
            {countries.list.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          {err('country')}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="age" className={labelClass}>
              Age <span className="text-rose-500">*</span>
            </label>
            <input
              id="age"
              type="number"
              inputMode="numeric"
              min={minAge}
              max={100}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder={`${minAge} or older`}
              className={`${fieldClass} ${border('age')}`}
            />
            {err('age')}
          </div>
          <div>
            <label htmlFor="gender" className={labelClass}>
              Gender <span className="text-rose-500">*</span>
            </label>
            <select id="gender" value={gender} onChange={(e) => setGender(e.target.value as Gender)} className={`${fieldClass} ${border('gender')}`}>
              <option value="">Select…</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            {err('gender')}
          </div>
        </div>

        {gender === 'self_describe' && (
          <div>
            <label htmlFor="genderText" className={labelClass}>
              Your gender <span className="text-rose-500">*</span>
            </label>
            <input id="genderText" value={genderText} maxLength={60} onChange={(e) => setGenderText(e.target.value)} className={`${fieldClass} ${border('genderText')}`} />
            {err('genderText')}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nickname" className={labelClass}>
              Name on your report <span className="normal-case font-normal text-slate-400">(optional)</span>
            </label>
            <input id="nickname" value={nickname} maxLength={60} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Alex" className={`${fieldClass} ${border('nickname')}`} />
            {err('nickname')}
          </div>
          <div>
            <label htmlFor="education" className={labelClass}>
              Education <span className="normal-case font-normal text-slate-400">(optional)</span>
            </label>
            <select id="education" value={education} onChange={(e) => setEducation(e.target.value as Education)} className={`${fieldClass} border-slate-300`}>
              <option value="">Prefer not to say</option>
              {EDUCATION.map((ed) => (
                <option key={ed.value} value={ed.value}>
                  {ed.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="occupation" className={labelClass}>
            Occupation or field <span className="normal-case font-normal text-slate-400">(optional)</span>
          </label>
          <input id="occupation" value={occupation} maxLength={100} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g. Software engineering, Teaching" className={`${fieldClass} border-slate-300`} />
        </div>

        {error && (
          <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button type="button" onClick={onBack} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 cursor-pointer">
            Back
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-7 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Begin assessment</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
