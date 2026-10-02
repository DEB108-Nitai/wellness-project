import React, { useState } from 'react';
import { Shield, Lock, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { storage } from '../../services/storageService';

interface PrivacyTermsViewProps {
  initialTab?: 'privacy' | 'terms' | 'delete';
}

export const PrivacyTermsView: React.FC<PrivacyTermsViewProps> = ({ initialTab = 'privacy' }) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'delete'>(initialTab);
  const [refId, setRefId] = useState('');
  const [email, setEmail] = useState('');
  const [submittedDeletion, setSubmittedDeletion] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refId.trim()) {
      setError('Please provide your 10-character Reference ID (e.g. WL-8K2Q9X).');
      return;
    }

    storage.submitDeletionRequest(refId, email);
    setSubmittedDeletion(true);
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 pb-24">
      {/* HEADER & TABS */}
      <div className="text-center space-y-3">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-3 py-1 rounded-full">
          Governance & Compliance
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">
          Privacy, Terms & Data Governance
        </h1>
        <p className="text-sm text-slate-600">
          Fully compliant with the General Data Protection Regulation (GDPR), the India DPDP Act 2023, and CCPA.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'privacy' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Privacy Policy
        </button>

        <button
          onClick={() => setActiveTab('terms')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'terms' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Terms of Service
        </button>

        <button
          onClick={() => setActiveTab('delete')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
            activeTab === 'delete' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-700 hover:bg-rose-50'
          }`}
        >
          Delete My Data Request
        </button>
      </div>

      {/* TAB 1: PRIVACY POLICY */}
      {activeTab === 'privacy' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">1. Data Minimization & Collection</h2>
            <p>
              Wellness collects only minimal demographics (country of residence, age range, and gender) necessary to calibrate statistical population Sten norms. We do not require real names, phone numbers, or social logins to take the assessment.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">2. Research & Norm Calibration</h2>
            <p>
              Anonymized question responses are aggregated to improve psychometric validity and factor analysis. Your individual response sheet is stored under a randomized cryptographic token and human-friendly reference ID.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">3. No Commercial Data Sale</h2>
            <p>
              We do not sell, rent, or trade assessment results with marketing or advertising brokers. Data is accessible solely to authorized researchers whose campaign link you voluntary completed, or to platform administrators for quality verification.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">4. Right to Erasure (GDPR Article 17 & DPDP)</h2>
            <p>
              You maintain the absolute right to have your assessment responses, factor scores, and session logs permanently purged. Submit your Reference Code via the "Delete My Data" tab to process your request.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: TERMS OF SERVICE */}
      {activeTab === 'terms' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">1. Purpose of the Assessment</h2>
            <p>
              Wellness 16 Personality Factors is an educational and self-insight instrument based on the public-domain International Personality Item Pool (IPIP). It is intended to foster personal development, communication awareness, and team cohesion.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">2. Non-Clinical & Non-Diagnostic Disclaimer</h2>
            <p>
              This questionnaire is <strong>not</strong> a medical or clinical psychiatric diagnostic tool. It should not be used as the sole criterion for clinical diagnosis, legal determination, or discriminatory employment practices.
            </p>
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-slate-900 font-heading">3. Intellectual Property</h2>
            <p>
              "Wellness" personality software and visual presentation layouts are proprietary. The underlying 16-factor item pool is utilized under the public-domain IPIP terms (ipip.ori.org). 16PF® is a registered trademark of its respective trademark holders with whom this independent research applet is not affiliated.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: DELETE DATA FORM */}
      {activeTab === 'delete' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6 max-w-2xl mx-auto">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <Trash2 className="w-5 h-5" />
              <span>Right to Erasure Request</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-heading">
              Request Permanent Data Deletion
            </h3>
            <p className="text-xs text-slate-500">
              Enter the unique Reference ID provided at the conclusion of your test (e.g. WL-7K2Q9X).
            </p>
          </div>

          {!submittedDeletion ? (
            <form onSubmit={handleDeleteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Participant Reference Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WL-8K2Q9X"
                  value={refId}
                  onChange={(e) => setRefId(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Email (Optional for confirmation notice)
                </label>
                <input
                  type="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Submit Deletion Request
              </button>
            </form>
          ) : (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900 font-heading">
                Deletion Request Queued
              </h4>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Your request to purge Reference ID <strong>{refId}</strong> has been logged in the administrator queue. All associated response records and scoring data will be purged.
              </p>
              <button
                onClick={() => setSubmittedDeletion(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200"
              >
                Submit Another Request
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
