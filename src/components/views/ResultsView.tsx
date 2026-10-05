import React, { useState } from 'react';
import {
  Download,
  Share2,
  Printer,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Info,
  ArrowRight,
  RotateCcw,
  Copy,
  Check,
  Award,
  TrendingUp,
  BrainCircuit,
  Compass,
  Layers
} from 'lucide-react';
import { TestSession } from '../../types';
import { BipolarBar } from '../common/BipolarBar';

interface ResultsViewProps {
  session: TestSession;
  onRetake: () => void;
  onNavigate: (view: string) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ session, onRetake, onNavigate }) => {
  const [copiedShare, setCopiedShare] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | 'high' | 'low' | 'average'>('all');

  const scores = session.scores || [];
  const globalDomains = session.globalDomains || [];
  const qualityFlags = session.qualityFlags;

  // Identify top high and low factors
  const sortedBySten = [...scores].sort((a, b) => b.sten - a.sten);
  const topHigh = sortedBySten.filter((s) => s.sten >= 7).slice(0, 3);
  const topLow = [...scores].sort((a, b) => a.sten - b.sten).filter((s) => s.sten <= 4).slice(0, 3);

  // Filtered list of scores
  const displayedScores = scores.filter((s) => {
    if (filterCategory === 'all') return true;
    return s.band === filterCategory;
  });

  const handleShare = () => {
    const url = `${window.location.origin}/results?token=${encodeURIComponent(session.token)}`;
    navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-12 pb-24">
      {/* RESULTS HEADER & META */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2.5 py-1 rounded-md">
                16 Personality Factors Profile
              </span>
              <span className="text-xs font-mono text-slate-500">
                Ref: {session.referenceId}
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-heading">
              {session.demographics.nickname || 'Participant'}’s Personality Report
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Completed on {new Date(session.completedAt || session.startedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} · Country: {session.demographics.country} · Age: {session.demographics.age}
            </p>
          </div>

          {/* Action Buttons (no-print) */}
          <div className="flex flex-wrap items-center gap-2.5 no-print">
            <button
              onClick={handleShare}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              {copiedShare ? <Check className="w-4 h-4 text-teal-600" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedShare ? 'Link Copied' : 'Share Profile'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / PDF Report</span>
            </button>

            <button
              onClick={onRetake}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retake</span>
            </button>
          </div>
        </div>

        {/* Quality Flag Notice if flagged */}
        {qualityFlags?.flagged && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">Test Quality & Confidence Note:</span>
              <p className="text-amber-800">
                {qualityFlags.notes.join(' ')} Your results remain valid as a provisional reference.
              </p>
            </div>
          </div>
        )}

        {/* KEY TRAITS SUMMARY GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* Top Distinctive Strengths (High Pole) */}
          <div className="bg-teal-50/60 border border-teal-200/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-teal-900 font-bold text-sm">
              <Award className="w-4 h-4 text-teal-600" />
              <span>Distinctive High-Pole Preferences</span>
            </div>
            <p className="text-xs text-teal-800 leading-relaxed">
              Traits where your responses placed you prominently above the population baseline:
            </p>
            <div className="space-y-2 pt-1">
              {topHigh.length > 0 ? (
                topHigh.map((f) => (
                  <div key={f.factorCode} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-teal-200">
                    <span className="font-semibold text-slate-800">
                      Factor {f.factorCode} · {f.factorName}
                    </span>
                    <span className="font-mono font-bold text-teal-700">
                      Sten {f.sten} ({f.highLabel.split(',')[0]})
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">Balanced distribution across average poles.</p>
              )}
            </div>
          </div>

          {/* Low Pole / Complementary Preferences */}
          <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              <span>Distinctive Low-Pole Preferences</span>
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">
              Traits reflecting preference for the left-hand behavioral spectrum:
            </p>
            <div className="space-y-2 pt-1">
              {topLow.length > 0 ? (
                topLow.map((f) => (
                  <div key={f.factorCode} className="flex justify-between items-center text-xs bg-white p-2 rounded-lg border border-rose-200">
                    <span className="font-semibold text-slate-800">
                      Factor {f.factorCode} · {f.factorName}
                    </span>
                    <span className="font-mono font-bold text-rose-700">
                      Sten {f.sten} ({f.lowLabel.split(',')[0]})
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">Balanced distribution across average poles.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5 GLOBAL DOMAINS SECTION */}
      {globalDomains.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                Higher-Order Synthesis
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
                5 Global Personality Domains
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {globalDomains.map((dom) => (
              <div
                key={dom.name}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-1">
                    <h4 className="text-sm font-bold text-slate-900 font-heading">{dom.name}</h4>
                    <span className="text-xs font-bold font-mono text-teal-700">
                      Sten {dom.sten}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">
                    {dom.description}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-600 rounded-full"
                      style={{ width: `${dom.sten * 10}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>Low</span>
                    <span>Average</span>
                    <span>High</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 16 FACTOR BIPOLAR CHARTS (CORE RESULTS MATRIX) */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
              Primary Trait Spectrum
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
              16 Factor Sten Score Breakdown
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Each factor represents a standardized continuous spectrum from 1 (Low Pole) to 10 (High Pole).
            </p>
          </div>

          {/* Filter tabs (no-print) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl no-print">
            {[
              { id: 'all', label: 'All 16' },
              { id: 'high', label: 'High (8-10)' },
              { id: 'average', label: 'Average (4-7)' },
              { id: 'low', label: 'Low (1-3)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterCategory(tab.id as any)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filterCategory === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bipolar Bars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedScores.map((sc) => (
            <BipolarBar key={sc.factorCode} score={sc} />
          ))}
        </div>
      </div>

      {/* STRENGTHS & DEVELOPMENT ROADMAP */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
            Practical Applications
          </span>
          <h3 className="text-2xl font-bold font-heading">
            Personal & Career Growth Recommendations
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            Leveraging your unique trait configuration in collaborative teams and professional leadership roles:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
            <h4 className="text-sm font-bold text-teal-300 font-heading">Collaboration & Communication</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Understand how your Warmth (A) and Privateness (N) shape interpersonal expectations. Share your communication style openly with teammates to prevent misunderstandings.
            </p>
          </div>

          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
            <h4 className="text-sm font-bold text-teal-300 font-heading">Workplace Energy & Urgency</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Align your Tension (Q4) and Perfectionism (Q3) with project deadlines. Use structured planning to harness internal drive without causing team burnout.
            </p>
          </div>

          <div className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
            <h4 className="text-sm font-bold text-teal-300 font-heading">Change & Innovation</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Your Openness to Change (Q1) and Abstractedness (M) determine how rapidly you adopt novel technologies. Pair with structured colleagues for balanced execution.
            </p>
          </div>
        </div>
      </div>

      {/* MEDICAL DISCLAIMER FOOTER */}
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-start gap-3">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong>Scientific Disclaimer:</strong> This personality profile is generated using standardized public-domain IPIP items and normative algorithms. It is intended for self-development, executive coaching, team optimization, and academic research. It is not intended for clinical, medical, or psychiatric diagnosis.
        </p>
      </div>
    </div>
  );
};
