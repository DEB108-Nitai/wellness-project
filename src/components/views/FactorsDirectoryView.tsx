import React, { useState } from 'react';
import { FactorCode, FactorDefinition } from '../../types';
import { FACTORS_DATA } from '../../data/factorsData';
import { Search, ArrowRight, BookOpen, Layers, Award } from 'lucide-react';

interface FactorsDirectoryViewProps {
  initialFactorCode?: string;
  onNavigate: (view: string, param?: string) => void;
}

export const FactorsDirectoryView: React.FC<FactorsDirectoryViewProps> = ({
  initialFactorCode,
  onNavigate,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeCode, setActiveCode] = useState<FactorCode>(
    (initialFactorCode as FactorCode) || 'A'
  );

  const factorList = Object.values(FACTORS_DATA);
  const activeFactor = FACTORS_DATA[activeCode] || factorList[0];

  const filteredFactors = factorList.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.code.toLowerCase().includes(search.toLowerCase()) ||
      f.shortDesc.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 pb-24">
      {/* HEADER */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-3 py-1 rounded-full">
          Psychometric Taxonomy
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">
          The 16 Personality Dimensions
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Explore the 16 primary personality factors derived from the scientific International Personality Item Pool (IPIP) construct.
        </p>
      </div>

      {/* SEARCH & CATEGORY FILTERS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search factors or traits..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto w-full sm:w-auto">
          {['all', 'Interpersonal', 'Cognitive', 'Emotional', 'Self-Regulation'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'all' ? 'All Dimensions' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2-COLUMN VIEW: SELECTOR LIST & DETAILED FACTOR CARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Factor List */}
        <div className="lg:col-span-5 space-y-2.5">
          {filteredFactors.map((f) => {
            const isSelected = f.code === activeCode;
            return (
              <button
                key={f.code}
                onClick={() => setActiveCode(f.code)}
                className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-white border-teal-500 ring-2 ring-teal-100 shadow-sm'
                    : 'bg-white/80 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs font-heading ${
                      isSelected ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {f.code}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 font-heading">{f.name}</h4>
                    <span className="text-[11px] text-slate-500">{f.category}</span>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400 font-medium">
                  {f.lowLabel.split(',')[0]} ↔ {f.highLabel.split(',')[0]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Deep-Dive Factor Detail */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 sticky top-24">
          <div className="space-y-2 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md">
                Factor {activeFactor.code} · {activeFactor.category}
              </span>
              <span className="text-xs text-slate-400">Order: #{activeFactor.sortOrder} of 16</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              {activeFactor.name}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {activeFactor.detailedDesc}
            </p>
          </div>

          {/* Bipolar Poles Breakdown */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Bipolar Spectrum Interpretation
            </h4>

            {/* Low Pole */}
            <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                <span>Low Pole (Sten 1–3)</span>
                <span>{activeFactor.lowLabel}</span>
              </div>
              <p className="text-xs text-rose-800 leading-relaxed">
                {activeFactor.lowPoleDesc}
              </p>
            </div>

            {/* Average Band */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Average Band (Sten 4–7)</span>
                <span>Balanced Trait Expression</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {activeFactor.averagePoleDesc}
              </p>
            </div>

            {/* High Pole */}
            <div className="bg-teal-50/60 border border-teal-200 rounded-2xl p-4.5 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-teal-900">
                <span>High Pole (Sten 8–10)</span>
                <span>{activeFactor.highLabel}</span>
              </div>
              <p className="text-xs text-teal-800 leading-relaxed">
                {activeFactor.highPoleDesc}
              </p>
            </div>
          </div>

          {/* Workplace & Leadership Impact */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-1.5">
            <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
              Workplace & Organizational Impact
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeFactor.workplaceImpact}
            </p>
          </div>

          <div className="pt-2 text-center">
            <button
              onClick={() => onNavigate('test')}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Test Your Score for Factor {activeFactor.code}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
