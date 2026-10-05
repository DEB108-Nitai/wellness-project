import React, { useEffect, useState } from 'react';
import { Faq, siteApi } from '../../api/site';
import { ChevronDown, ChevronUp, HelpCircle, Search, ArrowRight } from 'lucide-react';

interface FAQViewProps {
  onNavigate: (view: string) => void;
}

export const FAQView: React.FC<FAQViewProps> = ({ onNavigate }) => {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    siteApi
      .faqs()
      .then((list) => {
        setFaqs(list);
        setExpandedId(list[0]?.id ?? null);
      })
      .catch(() => setLoadError(true));
  }, []);

  const filtered = faqs.filter((f) => {
    const matchesSearch =
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.answer.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10 pb-24">
      <div className="text-center space-y-3">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-3 py-1 rounded-full">
          Frequently Asked Questions
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">
          Everything You Need to Know
        </h1>
        <p className="text-sm text-slate-600">
          Answers regarding the 16 personality assessment, Sten scores, data policies, and 60-day transformation challenges.
        </p>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto w-full sm:w-auto">
          {['all', ...Array.from(new Set(faqs.map((f) => f.category)))].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat === 'all' ? 'All Questions' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {loadError && (
          <p role="alert" className="text-sm text-rose-600 text-center">We could not load the FAQs right now. Please refresh the page.</p>
        )}
        {filtered.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all shadow-xs"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-teal-700 font-mono">[{item.category}]</span>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                    {item.question}
                  </h3>
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />}
              </button>

              {isExpanded && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in-50 duration-200">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Contact Prompt */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-center space-y-3">
        <h4 className="text-base font-bold text-slate-900 font-heading">Have a question not covered here?</h4>
        <p className="text-xs text-slate-600">Our wellness facilitators are happy to assist with any inquiries.</p>
        <button
          onClick={() => onNavigate('contact')}
          className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer"
        >
          Contact Support Team
        </button>
      </div>
    </div>
  );
};
