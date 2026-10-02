import React from 'react';
import { Users, Award, Search, BrainCircuit, TrendingUp, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface BenefitsViewProps {
  onNavigate: (view: string) => void;
}

export const BenefitsView: React.FC<BenefitsViewProps> = ({ onNavigate }) => {
  const benefits = [
    {
      title: "Improves business results through better people management",
      desc: "By understanding underlying personality traits—such as Emotional Stability (C), Rule-Consciousness (G), and Perfectionism (Q3)—managers can design optimal roles, reduce interpersonal friction, and build high-performing teams.",
      icon: Users,
    },
    {
      title: "Enables the right selection and development decisions",
      desc: "Avoid bias and surface impressions in recruitment. 16-factor psychometric profiling provides objective, normed behavioral benchmarks to match candidates with the intrinsic demands of key positions.",
      icon: Award,
    },
    {
      title: "Promotes more probing and insightful interviews with structured prompts",
      desc: "Use trait scores to formulate targeted, behavioral competency interview questions that uncover real working styles, conflict resolution approaches, and leadership styles.",
      icon: Search,
    },
    {
      title: "Enables you to see the whole picture when it comes to talent management",
      desc: "Go beyond simplistic 4-letter type boxes. The 16-factor matrix evaluates interpersonal warmth, intellectual reasoning, emotional resilience, assertiveness, and self-control on continuous scales.",
      icon: BrainCircuit,
    },
    {
      title: "Reduces risk in decision making about key roles",
      desc: "Executive transitions fail most frequently due to unexamined behavioral blindspots. Standardized psychometrics flags potential risks before costly appointments are finalized.",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-16 pb-24">
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-3 py-1 rounded-full">
          Organizational Impact
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 font-heading">
          Key Uses & Benefits
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          How objective 16-factor psychometrics empowers individuals, teams, and enterprises.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {benefits.map((b, idx) => {
          const Icon = b.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs flex flex-col justify-between space-y-5 hover:shadow-md hover:border-teal-400/50 transition-all"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-heading leading-snug">
                  {b.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {b.desc}
                </p>
              </div>
            </div>
          );
        })}

        {/* Start Assessment Card */}
        <div className="bg-gradient-to-br from-teal-700 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">
              Ready to begin?
            </span>
            <h3 className="text-xl font-bold font-heading">
              Take the Assessment for Your Own Profile
            </h3>
            <p className="text-xs text-teal-100 leading-relaxed">
              20 minutes, 163 statements, instant visual report with Sten score breakdowns.
            </p>
          </div>
          <button
            onClick={() => onNavigate('test')}
            className="w-full py-3 bg-white text-teal-900 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Start Assessment Now</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
