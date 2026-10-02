import React, { useState } from 'react';
import { FactorDefinition } from '../../types';
import { ArrowRight, RotateCw, Info } from 'lucide-react';

interface FactorCardProps {
  factor: FactorDefinition;
  onExplore?: (code: string) => void;
}

export const FactorCard: React.FC<FactorCardProps> = ({ factor, onExplore }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Gradient themes based on category
  const categoryGradients: Record<string, { bg: string; border: string; text: string; lightBg: string }> = {
    Interpersonal: {
      bg: 'from-blue-600 to-indigo-600',
      border: 'border-blue-200',
      text: 'text-blue-700',
      lightBg: 'bg-blue-50',
    },
    Cognitive: {
      bg: 'from-teal-600 to-emerald-700',
      border: 'border-teal-200',
      text: 'text-teal-700',
      lightBg: 'bg-teal-50',
    },
    Emotional: {
      bg: 'from-indigo-600 to-violet-700',
      border: 'border-indigo-200',
      text: 'text-indigo-700',
      lightBg: 'bg-indigo-50',
    },
    'Self-Regulation': {
      bg: 'from-sky-600 to-blue-700',
      border: 'border-sky-200',
      text: 'text-sky-700',
      lightBg: 'bg-sky-50',
    },
  };

  const theme = categoryGradients[factor.category] || categoryGradients.Interpersonal;

  return (
    <div
      className="relative min-h-[190px] w-full rounded-2xl transition-all duration-300 transform perspective-1000 group select-none"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div
        className={`w-full h-full rounded-2xl p-5 cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 border ${
          isFlipped ? 'bg-slate-900 text-white border-slate-700' : 'bg-gradient-to-br from-[#4A7BBF] to-[#3B6BAE] text-white border-blue-400/40'
        }`}
      >
        {!isFlipped ? (
          <div className="flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-xs tracking-wider">
                {factor.code}
              </span>
              <span className="text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/15 text-white/90">
                {factor.category}
              </span>
            </div>

            <div className="my-auto text-center py-2">
              <h3 className="text-base sm:text-lg font-bold tracking-tight uppercase leading-tight font-heading">
                {factor.name}
              </h3>
            </div>

            <div className="flex items-center justify-between text-[11px] text-blue-100/90 pt-1 border-t border-white/15">
              <span>Click to reveal details</span>
              <RotateCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500 opacity-80" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col justify-between h-full space-y-2 animate-in fade-in-50 duration-200">
            <div>
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-700">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider font-heading">
                  Factor {factor.code}: {factor.name}
                </span>
                <span className="text-[10px] text-slate-400">Click to flip back</span>
              </div>
              <p className="text-xs text-slate-200 mt-2 leading-relaxed line-clamp-3">
                {factor.shortDesc}
              </p>
            </div>

            <div className="space-y-1 text-[11px] bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-rose-300 font-medium">Low: {factor.lowLabel.split(',')[0]}</span>
                <span className="text-slate-500 font-bold">vs</span>
                <span className="text-teal-300 font-medium">High: {factor.highLabel.split(',')[0]}</span>
              </div>
            </div>

            {onExplore && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExplore(factor.code);
                }}
                className="w-full py-1 text-center text-[11px] font-medium text-teal-400 hover:text-teal-300 flex items-center justify-center gap-1 transition-colors"
              >
                <span>Full Factor Breakdown</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
