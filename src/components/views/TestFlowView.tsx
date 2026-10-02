import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Shield,
  Copy,
  Check,
  Star,
  RefreshCw,
  HelpCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { QUESTIONS_POOL } from '../../data/questionsData';
import { Demographics, TestSession } from '../../types';
import { storage } from '../../services/storageService';

interface TestFlowViewProps {
  onComplete: (token: string) => void;
  onNavigate: (view: string) => void;
  campaignSlug?: string;
}

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'IN', name: 'India' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'BR', name: 'Brazil' },
  { code: 'JP', name: 'Japan' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'OTHER', name: 'Other Country' },
];

export const TestFlowView: React.FC<TestFlowViewProps> = ({
  onComplete,
  onNavigate,
  campaignSlug,
}) => {
  // Steps: 'consent' | 'demographics' | 'questions' | 'review' | 'thankyou'
  const [step, setStep] = useState<'consent' | 'demographics' | 'questions' | 'review' | 'thankyou'>('consent');

  // Consent states
  const [consentTerms, setConsentTerms] = useState(false);
  const [consentDiagnostic, setConsentDiagnostic] = useState(false);
  const [consentError, setConsentError] = useState('');

  // Demographics states
  const [country, setCountry] = useState('US');
  const [age, setAge] = useState<number | ''>(28);
  const [gender, setGender] = useState<'Female' | 'Male' | 'Non-binary' | 'Prefer not to say' | 'Self-describe'>('Female');
  const [nickname, setNickname] = useState('');
  const [education, setEducation] = useState('Bachelor\'s Degree');
  const [occupation, setOccupation] = useState('');
  const [demoError, setDemoError] = useState('');

  // Session state
  const [session, setSession] = useState<TestSession | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const totalPages = Math.ceil(QUESTIONS_POOL.length / itemsPerPage); // 24

  // Timer & UI helpers
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [copiedRef, setCopiedRef] = useState(false);
  const [missingQuestionId, setMissingQuestionId] = useState<number | null>(null);

  // Post-test review
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const questionContainerRef = useRef<HTMLDivElement>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timer tick
  useEffect(() => {
    if (step === 'questions') {
      const timer = setInterval(() => setSecondsSpent((s) => s + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  // Keyboard shortcut listener for options (1 to 5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (step !== 'questions') return;
      if (['1', '2', '3', '4', '5'].includes(e.key)) {
        // Find first unanswered question on page
        const pageQuestions = QUESTIONS_POOL.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
        const unanswered = pageQuestions.find((q) => !answers[q.id]);
        if (unanswered) {
          handleSelectAnswer(unanswered.id, parseInt(e.key, 10));
        }
      } else if (e.key === 'Enter') {
        handleNextPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, currentPage, answers]);

  // Handler: Consent submission
  const handleConsentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentTerms || !consentDiagnostic) {
      setConsentError('Please accept both consent statements to proceed.');
      return;
    }
    setConsentError('');
    setStep('demographics');
  };

  // Handler: Demographics submission & Session creation
  const handleDemographicsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof age !== 'number' || age < 13 || age > 100) {
      setDemoError('Please enter a valid age between 13 and 100.');
      return;
    }

    const demo: Demographics = {
      country,
      age,
      gender,
      nickname: nickname.trim() || 'Participant',
      education,
      occupationField: occupation.trim() || 'General Professional',
    };

    const newSession = storage.startSession(demo, campaignSlug);
    setSession(newSession);
    setAnswers(newSession.draftAnswers || {});
    setStep('questions');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler: Selecting answer for a statement
  const handleSelectAnswer = (questionId: number, value: number) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    setMissingQuestionId(null);
    setSaveStatus('saving');

    if (session) {
      storage.autosaveAnswers(session.token, updated, currentPage, 2);
      setTimeout(() => setSaveStatus('saved'), 300);
    }

    // Auto-scroll to next question on page if exists
    setTimeout(() => {
      const pageQuestions = QUESTIONS_POOL.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
      const nextUnanswered = pageQuestions.find((q) => !updated[q.id]);
      if (nextUnanswered) {
        const el = document.getElementById(`q-${nextUnanswered.id}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  // Handler: Next page with validation
  const handleNextPage = () => {
    const pageQuestions = QUESTIONS_POOL.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const firstMissing = pageQuestions.find((q) => !answers[q.id]);

    if (firstMissing) {
      setMissingQuestionId(firstMissing.id);
      const el = document.getElementById(`q-${firstMissing.id}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setStep('review');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handler: Final submit
  const handleFinalSubmit = () => {
    if (!session) return;
    const res = storage.submitSession(session.token);
    if ('error' in res && !('session' in res)) {
      alert(res.error);
      return;
    }
    setStep('thankyou');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler: Rating submit
  const handleReviewSubmit = () => {
    if (session) {
      storage.saveReview(session.token, reviewRating, reviewComment);
      setReviewSubmitted(true);
    }
  };

  const copyReferenceCode = () => {
    if (session) {
      navigator.clipboard.writeText(session.referenceId);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  // Calculations for progress bar
  const totalQuestions = QUESTIONS_POOL.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  // Get current page statements
  const currentQuestions = QUESTIONS_POOL.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --- STEP 1: CONSENT SCREEN ---
  if (step === 'consent') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Step 1 of 2 · Informed Consent
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
              16 Personality Factors Assessment
            </h2>
            <p className="text-sm text-slate-600 max-w-xl mx-auto">
              Please review the participation parameters before beginning your assessment.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 text-xs sm:text-sm text-slate-700 leading-relaxed">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <Clock className="w-4 h-4 text-teal-600" />
              <span>Assessment Scope & Guidelines</span>
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600">
              <li><strong>Time Commitment:</strong> Approximately 20–25 minutes (163 brief statements).</li>
              <li><strong>No Right or Wrong Answers:</strong> Describe yourself as you generally are, not as you wish to be.</li>
              <li><strong>Continuous Autosave:</strong> Your progress is continuously saved to your device.</li>
              <li><strong>Confidentiality:</strong> Responses are anonymized and evaluated using standard IPIP Sten norms.</li>
            </ul>
          </div>

          <form onSubmit={handleConsentSubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-200 hover:border-teal-500/50 bg-white transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentTerms}
                  onChange={(e) => setConsentTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-slate-700">
                  I agree to the <button type="button" onClick={() => onNavigate('privacy-terms')} className="text-teal-700 font-medium underline">Terms of Service</button> and <button type="button" onClick={() => onNavigate('privacy-terms')} className="text-teal-700 font-medium underline">Privacy Policy</button>, and consent to my anonymized responses being evaluated for psychometric scoring and research.
                </span>
              </label>

              <label className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-200 hover:border-teal-500/50 bg-white transition-all cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentDiagnostic}
                  onChange={(e) => setConsentDiagnostic(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-xs sm:text-sm text-slate-700">
                  I understand that this assessment is designed for self-understanding, coaching, and organizational insight, and is <strong>not</strong> a medical or clinical psychological diagnosis.
                </span>
              </label>
            </div>

            {consentError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{consentError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => onNavigate('landing')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Back to Home
              </button>

              <button
                type="submit"
                disabled={!consentTerms || !consentDiagnostic}
                className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Continue to Demographics</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- STEP 2: DEMOGRAPHICS SCREEN ---
  if (step === 'demographics') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Step 2 of 2 · Participant Profile
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
              Basic Demographics
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Used solely for calibrating population norm distributions and research insights.
            </p>
          </div>

          <form onSubmit={handleDemographicsSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Country of Residence <span className="text-rose-500">*</span>
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Age (13–100) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={13}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(e.target.value ? parseInt(e.target.value, 10) : '')}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                  <option value="Self-describe">Self-describe</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Preferred Nickname (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Education Level (Optional)
                </label>
                <select
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:border-teal-500"
                >
                  <option value="High School">High School</option>
                  <option value="Bachelor's Degree">Bachelor's Degree</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="Doctorate / Professional">Doctorate / Professional</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {demoError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{demoError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep('consent')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Back
              </button>

              <button
                type="submit"
                className="px-7 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Begin Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // --- STEP 3: CORE TEST EXPERIENCE (16Personalities style circular scale) ---
  if (step === 'questions') {
    return (
      <div className="min-h-screen pb-24">
        {/* STICKY TOP PROGRESS BAR */}
        <div className="sticky top-18 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-900">
                  Page {currentPage} of {totalPages}
                </span>
                <span className="text-slate-400">·</span>
                <span>{answeredCount} of {totalQuestions} answered</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-teal-700 font-bold font-mono">
                  {progressPercent}% Complete
                </span>
                <span className="hidden sm:inline text-slate-400">·</span>
                <span className="hidden sm:flex items-center gap-1 text-slate-500 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {Math.floor(secondsSpent / 60)}:{String(secondsSpent % 60).padStart(2, '0')}
                </span>
                <span className="text-xs text-slate-400">
                  {saveStatus === 'saved' ? 'Saved ✓' : 'Saving...'}
                </span>
              </div>
            </div>

            {/* Track */}
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* OFFLINE BANNER IF DISCONNECTED */}
        {!isOnline && (
          <div className="max-w-4xl mx-auto px-4 pt-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-amber-600" />
              <span>Offline mode active: Your answers are safely stored on this device and will sync automatically.</span>
            </div>
          </div>
        )}

        {/* ENCOURAGEMENT CHIPS */}
        {progressPercent === 50 && (
          <div className="max-w-4xl mx-auto px-4 pt-4">
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span className="font-semibold">Halfway there! Keep going with your first natural instinct.</span>
              </div>
            </div>
          </div>
        )}

        {/* QUESTIONS CONTAINER */}
        <div ref={questionContainerRef} className="max-w-3xl mx-auto px-4 pt-8 space-y-12">
          {currentQuestions.map((q, idx) => {
            const currentAnswer = answers[q.id];
            const isMissing = missingQuestionId === q.id;

            return (
              <div
                key={q.id}
                id={`q-${q.id}`}
                className={`pt-6 pb-8 px-4 sm:px-8 rounded-3xl transition-all duration-200 text-center space-y-6 ${
                  isMissing
                    ? 'bg-rose-50/70 ring-2 ring-rose-400'
                    : currentAnswer
                    ? 'bg-white shadow-xs border border-slate-200/90'
                    : 'bg-white/60 border border-slate-200/50'
                }`}
              >
                {/* Statement Text */}
                <div className="space-y-1 max-w-2xl mx-auto">
                  <span className="text-[11px] font-mono font-medium text-slate-400 block">
                    Statement {q.position} of {totalQuestions}
                  </span>
                  <h3 className="text-lg sm:text-xl font-semibold text-slate-900 leading-snug font-heading">
                    "{q.text}"
                  </h3>
                </div>

                {/* 5 Circular Scale Options (16Personalities style) */}
                <div className="flex flex-col items-center justify-center space-y-3 pt-2">
                  {/* Top Pole Indicators */}
                  <div className="w-full max-w-md flex justify-between items-center text-xs font-bold uppercase tracking-wider px-2">
                    <span className="text-rose-600">Disagree</span>
                    <span className="text-teal-700">Agree</span>
                  </div>

                  {/* Circles Row (Sizes: L, M, S, M, L) */}
                  <div className="flex items-center justify-center gap-3 sm:gap-6 py-2">
                    {/* 1: Strongly Disagree (Large Coral) */}
                    <button
                      type="button"
                      onClick={() => handleSelectAnswer(q.id, 1)}
                      title="Strongly Disagree"
                      aria-label="Strongly Disagree"
                      className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                        currentAnswer === 1
                          ? 'bg-rose-500 border-rose-500 text-white scale-110 shadow-md ring-4 ring-rose-200'
                          : 'border-rose-400/80 hover:border-rose-500 hover:bg-rose-50/50 text-transparent'
                      }`}
                    >
                      {currentAnswer === 1 && <Check className="w-5 h-5 stroke-[3]" />}
                    </button>

                    {/* 2: Disagree (Medium Coral) */}
                    <button
                      type="button"
                      onClick={() => handleSelectAnswer(q.id, 2)}
                      title="Disagree"
                      aria-label="Disagree"
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                        currentAnswer === 2
                          ? 'bg-rose-400 border-rose-400 text-white scale-110 shadow-md ring-4 ring-rose-100'
                          : 'border-rose-300 hover:border-rose-400 hover:bg-rose-50/40 text-transparent'
                      }`}
                    >
                      {currentAnswer === 2 && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    {/* 3: Neutral (Small Gray) */}
                    <button
                      type="button"
                      onClick={() => handleSelectAnswer(q.id, 3)}
                      title="Neutral"
                      aria-label="Neutral"
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                        currentAnswer === 3
                          ? 'bg-slate-500 border-slate-500 text-white scale-110 shadow-md ring-4 ring-slate-200'
                          : 'border-slate-300 hover:border-slate-400 hover:bg-slate-100 text-transparent'
                      }`}
                    >
                      {currentAnswer === 3 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    {/* 4: Agree (Medium Teal) */}
                    <button
                      type="button"
                      onClick={() => handleSelectAnswer(q.id, 4)}
                      title="Agree"
                      aria-label="Agree"
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                        currentAnswer === 4
                          ? 'bg-teal-500 border-teal-500 text-white scale-110 shadow-md ring-4 ring-teal-100'
                          : 'border-teal-400 hover:border-teal-500 hover:bg-teal-50/40 text-transparent'
                      }`}
                    >
                      {currentAnswer === 4 && <Check className="w-4 h-4 stroke-[3]" />}
                    </button>

                    {/* 5: Strongly Agree (Large Teal) */}
                    <button
                      type="button"
                      onClick={() => handleSelectAnswer(q.id, 5)}
                      title="Strongly Agree"
                      aria-label="Strongly Agree"
                      className={`w-12 h-12 sm:w-13 sm:h-13 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer ${
                        currentAnswer === 5
                          ? 'bg-teal-600 border-teal-600 text-white scale-110 shadow-md ring-4 ring-teal-200'
                          : 'border-teal-500/80 hover:border-teal-600 hover:bg-teal-50/50 text-transparent'
                      }`}
                    >
                      {currentAnswer === 5 && <Check className="w-5 h-5 stroke-[3]" />}
                    </button>
                  </div>
                </div>

                {isMissing && (
                  <p className="text-xs font-semibold text-rose-600 animate-bounce">
                    Please select an answer to continue.
                  </p>
                )}
              </div>
            );
          })}

          {/* PAGE NAVIGATION BUTTONS */}
          <div className="pt-8 flex items-center justify-between gap-4 border-t border-slate-200">
            <button
              type="button"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>

            <div className="text-xs text-slate-500 hidden sm:block">
              Tip: Press keyboard keys <span className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">1-5</span> to answer, <span className="font-mono font-bold bg-slate-100 px-1 py-0.5 rounded">Enter</span> for Next.
            </div>

            <button
              type="button"
              onClick={handleNextPage}
              className="px-7 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{currentPage === totalPages ? 'Review Answers' : 'Next Page'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- STEP 4: REVIEW SCREEN ---
  if (step === 'review') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Assessment Summary
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
              Ready to Compute Your Profile
            </h2>
            <p className="text-sm text-slate-600">
              You have answered <span className="font-bold text-teal-700">{answeredCount} of {totalQuestions}</span> statements.
            </p>
          </div>

          {/* Grid of 24 Page Chips */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Page Completion Map (Click any to jump and edit)
            </h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                const pageQuestions = QUESTIONS_POOL.slice((pg - 1) * itemsPerPage, pg * itemsPerPage);
                const isComplete = pageQuestions.every((q) => answers[q.id]);
                return (
                  <button
                    key={pg}
                    onClick={() => {
                      setCurrentPage(pg);
                      setStep('questions');
                    }}
                    className={`py-2 px-1 text-center rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                      isComplete
                        ? 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100'
                        : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                    }`}
                  >
                    Pg {pg} {isComplete ? '✓' : '!'}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs text-slate-600">
            <span>Participant: <strong>{session?.demographics.nickname || 'Anonymous'}</strong></span>
            <span>Total Duration: <strong>{Math.round(secondsSpent / 60)} mins</strong></span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setCurrentPage(totalPages);
                setStep('questions');
              }}
              className="w-full sm:w-auto px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50"
            >
              Back to Questions
            </button>

            <button
              type="button"
              onClick={handleFinalSubmit}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Submit & View Results</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- STEP 5: THANK YOU & RATING SCREEN ---
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm text-center space-y-8 animate-in fade-in-50 duration-300">
        <div className="w-16 h-16 rounded-full bg-teal-100 text-teal-700 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
            Assessment Completed!
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Your answers have been scored against standard IPIP 16-factor population norms.
          </p>
        </div>

        {/* Reference Code Card */}
        {session && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2 text-center max-w-sm mx-auto">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Your Reference Code
            </span>
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl font-mono font-bold text-slate-900">
                {session.referenceId}
              </span>
              <button
                onClick={copyReferenceCode}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                title="Copy reference code"
              >
                {copiedRef ? <Check className="w-4 h-4 text-teal-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Save this code to access your profile or request data deletion later.
            </p>
          </div>
        )}

        {/* Experience Rating */}
        <div className="border-t border-b border-slate-100 py-6 space-y-4">
          <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Rate Your Experience
          </h4>
          
          {!reviewSubmitted ? (
            <div className="space-y-3 max-w-md mx-auto">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setReviewRating(star)}
                    className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${star <= reviewRating ? 'fill-amber-400' : 'text-slate-300'}`}
                    />
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Optional feedback or comments..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400"
              />
              <button
                onClick={handleReviewSubmit}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Submit Feedback
              </button>
            </div>
          ) : (
            <p className="text-xs text-teal-700 font-medium">
              Thank you for your feedback!
            </p>
          )}
        </div>

        {/* Action Button: View Results */}
        <div className="pt-2">
          <button
            onClick={() => session && onComplete(session.token)}
            className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-base shadow-lg shadow-teal-600/25 transition-all flex items-center justify-center gap-2.5 mx-auto cursor-pointer"
          >
            <span>View Full Personality Profile</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
