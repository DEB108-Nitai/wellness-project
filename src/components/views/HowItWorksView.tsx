import React from 'react';
import { ArrowRight, CheckCircle2, Clock, Sparkles, Shield, BarChart3, Users, Award, BookOpen } from 'lucide-react';

interface HowItWorksViewProps {
  onNavigate: (view: string) => void;
}

export const HowItWorksView: React.FC<HowItWorksViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16 pb-24">
      {/* HEADER */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-3 py-1 rounded-full">
          Methodology & Science
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-heading">
          How the 16 Factors Assessment Works
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          A standardized, continuous psychometric measurement model built on decades of peer-reviewed personality research and the International Personality Item Pool (IPIP).
        </p>
      </div>

      {/* 4-STEP DETAIL */}
      <div className="space-y-8">
        {[
          {
            step: '01',
            title: 'Informed Consent & Demographic Calibration',
            desc: 'Before taking the assessment, participants review the purpose and parameters of the instrument. Basic demographic indicators (such as country of residence and age) allow our normative algorithm to standardize raw scores against international reference populations.',
            points: ['Anonymized response tracking', 'Privacy compliance under GDPR and DPDP', 'Instant session initialization'],
          },
          {
            step: '02',
            title: '166 Research-Based Statements on a 5-Point Scale',
            desc: 'Participants respond to 166 clear, behavioral statements divided into 24 digestible screens (7 items per page). The circular agreement scale captures fine gradations of self-reported behavior without forcing false dichotomies.',
            points: ['Auto-scroll to next statement for rapid completion', 'Answers save automatically — resume on any device', 'Embedded attention checks ensure high data fidelity'],
          },
          {
            step: '03',
            title: 'Standard Ten (Sten) Normalization Engine',
            desc: 'Raw scores across all 16 factor scales are normalized into Sten scores (ranging from 1 to 10 with a mean of 5.5 and standard deviation of 2.0). Scores are classified into Low Pole (1-3), Average Band (4-7), and High Pole (8-10).',
            points: ['Zero arbitrary bucket stereotyping', 'Scientifically validated z-score transformations', 'Comprehensive factor bipolar analysis'],
          },
          {
            step: '04',
            title: 'Visual Reporting, Global Domains & Practical Coaching',
            desc: 'Upon submission, you receive an instant visual dashboard containing all 16 bipolar trait bars, 5 higher-order global personality domains, distinct strengths, and actionable developmental recommendations.',
            points: ['Printable / PDF diagnostic portfolio', 'One-click shareable profile links', 'Direct applicability to leadership coaching and hiring'],
          },
        ].map((s) => (
          <div
            key={s.step}
            className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-6 items-start"
          >
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 font-black text-2xl font-mono flex items-center justify-center shrink-0 border border-teal-200">
              {s.step}
            </div>
            <div className="space-y-3 flex-1">
              <h3 className="text-xl font-bold text-slate-900 font-heading">{s.title}</h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
                {s.points.map((pt, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-700 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="text-center bg-slate-900 text-white rounded-3xl p-8 sm:p-12 space-y-6">
        <h3 className="text-2xl font-bold font-heading">Ready to Experience the Assessment?</h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          Takes only ~20 minutes. Receive your complete 16-factor profile immediately.
        </p>
        <button
          onClick={() => onNavigate('test')}
          className="px-8 py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm rounded-xl transition-all cursor-pointer inline-flex items-center gap-2"
        >
          <span>Start Assessment</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
