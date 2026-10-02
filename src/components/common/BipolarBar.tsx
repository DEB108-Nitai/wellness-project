import React, { useState } from 'react';
import { FactorScoreResult } from '../../types';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

interface BipolarBarProps {
  score: FactorScoreResult;
  showDetailsDefault?: boolean;
}

export const BipolarBar: React.FC<BipolarBarProps> = ({ score, showDetailsDefault = false }) => {
  const [expanded, setExpanded] = useState(showDetailsDefault);

  // Sten is 1 to 10. Position in percentage: (sten - 0.5) / 10 * 100
  const markerPercentage = Math.max(5, Math.min(95, ((score.sten - 0.5) / 10) * 100));

  const bandColors = {
    low: {
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      marker: 'bg-rose-600 ring-rose-300',
      label: 'Low Pole (1-3)',
    },
    average: {
      badge: 'bg-slate-100 text-slate-800 border-slate-200',
      marker: 'bg-teal-600 ring-teal-300',
      label: 'Average Band (4-7)',
    },
    high: {
      badge: 'bg-teal-100 text-teal-800 border-teal-200',
      marker: 'bg-teal-600 ring-teal-300',
      label: 'High Pole (8-10)',
    },
  };

  const theme = bandColors[score.band];

  return (
    <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
      {/* Header with Factor Name & Sten score */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-xs font-heading">
            {score.factorCode}
          </span>
          <h4 className="text-base font-semibold text-slate-900 font-heading">
            {score.factorName}
          </h4>
        </div>

        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${theme.badge}`}>
            Sten {score.sten} / 10 · {score.band.toUpperCase()}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 font-medium transition-colors"
            aria-expanded={expanded}
          >
            <span>{expanded ? 'Less' : 'Analysis'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Low & High Poles Label */}
      <div className="flex justify-between items-center text-xs font-medium text-slate-500 pt-1 pb-2">
        <span className="text-left text-slate-600 max-w-[45%] truncate" title={score.lowLabel}>
          ← {score.lowLabel}
        </span>
        <span className="text-right text-slate-600 max-w-[45%] truncate" title={score.highLabel}>
          {score.highLabel} →
        </span>
      </div>

      {/* 10-Point Sten Track Visualizer */}
      <div className="relative my-2 py-2">
        {/* Background Grid Segments (Low: 1-3, Avg: 4-7, High: 8-10) */}
        <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden border border-slate-200">
          <div className="w-[30%] bg-rose-50/80 border-r border-slate-200" title="Low Band (1-3)" />
          <div className="w-[40%] bg-teal-50/50 border-r border-slate-200" title="Average Band (4-7)" />
          <div className="w-[30%] bg-teal-50/80" title="High Band (8-10)" />
        </div>

        {/* 10 Tick marks */}
        <div className="absolute inset-x-0 top-2 h-3 flex justify-between px-1 pointer-events-none opacity-40">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
            <span key={t} className="w-px h-full bg-slate-400" />
          ))}
        </div>

        {/* Sten Marker Pin */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 flex flex-col items-center"
          style={{ left: `${markerPercentage}%` }}
        >
          <div
            className={`w-6 h-6 rounded-full text-white font-bold text-[11px] flex items-center justify-center shadow-md ring-3 ${theme.marker}`}
          >
            {score.sten}
          </div>
        </div>
      </div>

      {/* Sten Scale Numbers Line */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono px-1">
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span className="font-bold text-slate-600">5</span>
        <span className="font-bold text-slate-600">6</span>
        <span>7</span>
        <span>8</span>
        <span>9</span>
        <span>10</span>
      </div>

      {/* Expandable Psychological Interpretation */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-slate-100 animate-in fade-in-50 duration-200 space-y-2">
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            {score.interpretation}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
            <span>Raw Factor Sum: {score.rawScore}</span>
            <span>z-score: {score.zScore > 0 ? `+${score.zScore}` : score.zScore} (Percentile ~{score.percentile}%)</span>
          </div>
        </div>
      )}
    </div>
  );
};
