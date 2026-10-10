import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Award, Check, Copy, Info, Link2, Loader2, Printer, RotateCcw, Share2, TrendingUp, X } from 'lucide-react';
import { ApiError } from '../../api/client';
import { ResultReport, resultsApi, shareUrl } from '../../api/assessment';
import { BipolarBar } from '../common/BipolarBar';

interface ResultsViewProps {
  report: ResultReport;
  /** 'private' = owner/admin view, 'shared' = public link. */
  mode: 'private' | 'shared';
}

const regionName = (code?: string) => {
  if (!code) return '';
  try {
    return new Intl.DisplayNames([navigator.language, 'en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
};

/** The 16-factor report (PRD RES-2). */
export const ResultsView: React.FC<ResultsViewProps> = ({ report, mode }) => {
  const [filter, setFilter] = useState<'all' | 'high' | 'low' | 'average'>('all');
  const [shareToken, setShareToken] = useState<string | null>(report.shareToken ?? null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [shareError, setShareError] = useState('');
  const [copied, setCopied] = useState(false);

  const scores = report.factors;
  // Distinctive traits use the same bands as the bars: high 8–10, low 1–3.
  const topHigh = [...scores].filter((s) => s.band === 'high').sort((a, b) => b.sten - a.sten).slice(0, 3);
  const topLow = [...scores].filter((s) => s.band === 'low').sort((a, b) => a.sten - b.sten).slice(0, 3);
  const displayed = scores.filter((s) => filter === 'all' || s.band === filter);
  const canShare = mode === 'private' && report.isOwner;

  const toggleShare = async (enable: boolean) => {
    setShareBusy(true);
    setShareError('');
    try {
      setShareToken(enable ? (await resultsApi.share(report.ref)).shareToken : (await resultsApi.unshare(report.ref)).shareToken);
    } catch (err) {
      setShareError(err instanceof ApiError ? err.message : 'Could not update the share link.');
    } finally {
      setShareBusy(false);
    }
  };

  const copyLink = async () => {
    if (!shareToken) return;
    try {
      await navigator.clipboard.writeText(shareUrl(shareToken));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // the link is visible and selectable
    }
  };

  const name = report.nickname || 'Your';
  const completed = new Date(report.completedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-12 pb-24">
      {/* HEADER */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider bg-teal-50 px-2.5 py-1 rounded-md">16 Personality Factors Profile</span>
              <span className="text-xs font-mono text-slate-500">Ref: {report.ref}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 font-heading">
              {report.nickname ? `${name}’s` : 'Your'} Personality Report
            </h1>
            <p className="text-sm text-slate-500">
              Completed on {completed}
              {report.country ? ` · ${regionName(report.country)}` : ''}
              {report.age ? ` · Age ${report.age}` : ''}
            </p>
          </div>

          {mode === 'private' && (
            <div className="flex flex-wrap items-center gap-2.5 no-print">
              {canShare && (
                <button
                  onClick={() => setShareOpen((o) => !o)}
                  className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 cursor-pointer"
                  aria-expanded={shareOpen}
                >
                  <Share2 className="w-4 h-4" /> Share
                </button>
              )}
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print / PDF
              </button>
              {report.isOwner && (
                <Link to="/test" className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4" /> Retake
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Share panel (RES-4) */}
        {canShare && shareOpen && (
          <div className="no-print p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-teal-600" /> Share link
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Anyone with the link can view this report. Your age and country are never shown. You can turn the link off at any time.
                </p>
              </div>
              <button onClick={() => setShareOpen(false)} className="p-1 rounded-lg hover:bg-slate-200 cursor-pointer" aria-label="Close">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {shareToken ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <input readOnly value={shareUrl(shareToken)} onFocus={(e) => e.target.select()} className="flex-1 h-10 px-3 text-sm font-mono rounded-xl border border-slate-300 bg-white" />
                <button onClick={copyLink} className="h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy'}
                </button>
                <button
                  onClick={() => toggleShare(false)}
                  disabled={shareBusy}
                  className="h-10 px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-sm font-semibold cursor-pointer disabled:opacity-60"
                >
                  Turn off
                </button>
              </div>
            ) : (
              <button
                onClick={() => toggleShare(true)}
                disabled={shareBusy}
                className="h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {shareBusy && <Loader2 className="w-4 h-4 animate-spin" />} Create share link
              </button>
            )}
            {shareError && <p className="text-xs text-rose-600">{shareError}</p>}
          </div>
        )}

        {report.quality.flagged && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold">These results may be less reliable</span>
              <p className="text-amber-800">{report.quality.notes.join(' ')} Consider retaking the assessment at a calm moment.</p>
            </div>
          </div>
        )}

        {/* KEY TRAITS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <TraitList
            title="Your most distinctive high scores"
            caption="Traits where you scored well above most people (Sten 8–10):"
            icon={<Award className="w-4 h-4 text-teal-600" />}
            tone="teal"
            items={topHigh.map((f) => ({ key: f.factorCode, label: `${f.factorName} (${f.factorCode})`, value: `Sten ${f.sten} · ${f.highLabel.split(',')[0]}` }))}
          />
          <TraitList
            title="Your most distinctive low scores"
            caption="Traits where you scored well below most people (Sten 1–3):"
            icon={<TrendingUp className="w-4 h-4 text-rose-600" />}
            tone="rose"
            items={topLow.map((f) => ({ key: f.factorCode, label: `${f.factorName} (${f.factorCode})`, value: `Sten ${f.sten} · ${f.lowLabel.split(',')[0]}` }))}
          />
        </div>
      </div>

      {/* GLOBAL DOMAINS */}
      <div className="space-y-4">
        <div>
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">The big picture</span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">5 Global Personality Domains</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {report.domains.map((dom) => (
            <div key={dom.code} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-sm font-bold text-slate-900 font-heading">{dom.name}</h3>
                  <span className="text-xs font-bold font-mono text-teal-700">Sten {dom.sten}</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{dom.description}</p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-teal-600 rounded-full" style={{ width: `${dom.sten * 10}%` }} />
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

      {/* 16 FACTORS */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">Your 16 factors</span>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">Factor-by-factor results</h2>
            <p className="text-sm text-slate-500">Each factor runs from 1 (low pole) to 10 (high pole); 4–7 is the typical range.</p>
          </div>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl no-print overflow-x-auto">
            {[
              { id: 'all', label: 'All 16' },
              { id: 'high', label: 'High (8–10)' },
              { id: 'average', label: 'Typical (4–7)' },
              { id: 'low', label: 'Low (1–3)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as typeof filter)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
                  filter === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayed.map((sc) => (
            <BipolarBar key={sc.factorCode} score={sc} />
          ))}
          {displayed.length === 0 && <p className="text-sm text-slate-500 italic">No factors in this range.</p>}
        </div>
      </div>

      {/* GROWTH RECOMMENDATIONS */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 space-y-6">
        <div className="space-y-2">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">Practical applications</span>
          <h2 className="text-2xl font-bold font-heading">Personal & Career Growth Recommendations</h2>
          <p className="text-sm text-slate-300 max-w-2xl">Ways to put your trait profile to work in teams and leadership:</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          {[
            {
              title: 'Collaboration & Communication',
              text: 'Understand how your Warmth (A) and Privateness (N) shape interpersonal expectations. Share your communication style openly with teammates to prevent misunderstandings.',
            },
            {
              title: 'Workplace Energy & Urgency',
              text: 'Align your Tension (Q4) and Perfectionism (Q3) with project deadlines. Use structured planning to harness internal drive without causing team burnout.',
            },
            {
              title: 'Change & Innovation',
              text: 'Your Openness to Change (Q1) and Abstractedness (M) shape how quickly you adopt new ideas. Pair with structured colleagues for balanced execution.',
            },
          ].map((card) => (
            <div key={card.title} className="bg-slate-800/80 p-5 rounded-2xl border border-slate-700 space-y-2">
              <h3 className="text-sm font-bold text-teal-300 font-heading">{card.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">{card.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* DISCLAIMER */}
      <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 flex items-start gap-3">
        <Info className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
        <p>
          <strong>About this report:</strong> scores use the public-domain IPIP 16-factor scales and are compared with norms from more
          than 35,000 respondents (Open Psychometrics). The report is for self-understanding and personal growth and is not a clinical,
          medical or psychiatric diagnosis.
        </p>
      </div>
    </div>
  );
};

const TraitList: React.FC<{
  title: string;
  caption: string;
  icon: React.ReactNode;
  tone: 'teal' | 'rose';
  items: { key: string; label: string; value: string }[];
}> = ({ title, caption, icon, tone, items }) => {
  const box = tone === 'teal' ? 'bg-teal-50/60 border-teal-200/80' : 'bg-rose-50/50 border-rose-200/80';
  const text = tone === 'teal' ? 'text-teal-900' : 'text-rose-900';
  const row = tone === 'teal' ? 'border-teal-200 text-teal-700' : 'border-rose-200 text-rose-700';
  return (
    <div className={`${box} border rounded-2xl p-5 space-y-3`}>
      <div className={`flex items-center gap-2 ${text} font-bold text-sm`}>
        {icon}
        <span>{title}</span>
      </div>
      <p className={`text-xs ${text} opacity-80 leading-relaxed`}>{caption}</p>
      <div className="space-y-2 pt-1">
        {items.length > 0 ? (
          items.map((i) => (
            <div key={i.key} className={`flex justify-between items-center gap-3 text-xs bg-white p-2.5 rounded-lg border ${row}`}>
              <span className="font-semibold text-slate-800">{i.label}</span>
              <span className="font-mono font-bold text-right">{i.value}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-500 italic">None — your scores here are in the typical range.</p>
        )}
      </div>
    </div>
  );
};
