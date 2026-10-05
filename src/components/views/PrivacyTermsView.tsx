import React, { useState } from 'react';
import { Shield, Lock, CheckCircle2, FileText, Sparkles } from 'lucide-react';

interface PrivacyTermsViewProps {
  initialTab?: 'privacy' | 'terms';
}

export const PrivacyTermsView: React.FC<PrivacyTermsViewProps> = ({ initialTab = 'privacy' }) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 pb-24">
      {/* HEADER & TABS */}
      <div className="text-center space-y-3">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-3 py-1 rounded-full">
          Platform Governance
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">
          Privacy Policy & Terms of Service
        </h1>
        <p className="text-sm text-slate-600 max-w-2xl mx-auto">
          Information on how your assessment scores, demographics, and 60-day transformation challenge data are collected, utilized, and securely managed.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'privacy' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Privacy & Data Policy
        </button>

        <button
          onClick={() => setActiveTab('terms')}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'terms' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Terms of Service
        </button>
      </div>

      {/* TAB 1: PRIVACY POLICY */}
      {activeTab === 'privacy' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-600" />
              <span>1. Data Collection & Processing Scope</span>
            </h2>
            <p>
              When you participate in the Wellness 16 Personality Factors assessment or enroll in our 60-Day Transformation Challenges (Sonic, Philosophical and Transcendental Therapeutic Interventions), we collect and store:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Item response scores across the 166 personality questionnaire statements.</li>
              <li>Calculated Sten scale scores (1-10), z-scores, and 5 global domain profiles.</li>
              <li>Basic demographics (age group, gender, country) for benchmark calibration.</li>
              <li>Challenge registration information (name, contact details, preferred cohort timing, and stated goals).</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">2. Utilization of Data</h2>
            <p>
              All collected information is retained and utilized by the Wellness platform to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-600">
              <li>Generate and deliver your interactive, downloadable 16-factor visual personality report.</li>
              <li>Provide personalized mentoring and practice materials during the 60-day transformation tracks.</li>
              <li>Maintain your longitudinal assessment record so you can compare future test retakes over time.</li>
              <li>Refine statistical population norm distributions and improve psychometric scoring precision.</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">3. Security & Access Controls</h2>
            <p>
              Participant records are secured with industry-standard encryption, unique reference tokens, and strict access controls. Data is exclusively utilized for personal developmental insights, program delivery, and platform administration. We do not sell participant data to external advertising networks.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">4. Data Retention & Record Continuity</h2>
            <p>
              Assessment profiles and challenge milestones are permanently stored to ensure participants and program coaches maintain continuous access to their historical behavioral progress, reports, and transformation records.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: TERMS OF SERVICE */}
      {activeTab === 'terms' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <span>1. Purpose of Assessment & 60-Day Programs</span>
            </h2>
            <p>
              Wellness provides behavioral self-insight tools based on the scientific International Personality Item Pool (IPIP) and holistic lifestyle transformation methodologies. Our programs are designed to cultivate self-awareness, cognitive balance, habit discipline, and conscious personal growth.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">2. Educational & Non-Clinical Disclaimer</h2>
            <p>
              The 16 Personality Factors assessment and the 60-Day Challenges (STI, PTI and TTI) are educational and self-developmental frameworks. They do not constitute medical, clinical psychiatric, or diagnostic services.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">3. Participant Commitment & Code of Conduct</h2>
            <p>
              Participants enrolled in the 60-Day Challenges agree to participate respectfully in group reflection circles, honor peer privacy, and engage in daily practices in good faith.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">4. Intellectual Property</h2>
            <p>
              "Wellness" personality algorithms, presentation layouts, and 60-Day Challenge curriculums are proprietary. The underlying 16-factor item pool is utilized in accordance with the public-domain IPIP terms (ipip.ori.org).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
