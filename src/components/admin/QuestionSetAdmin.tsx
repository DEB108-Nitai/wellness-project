import React, { useEffect, useMemo, useState } from 'react';
import { ItemRow, NormsData, siteAdminApi } from '../../api/admin';
import { ApiError } from '../../api/client';
import { Badge, ErrorBox, filterControl, LoadingBlock, PageHeader, Panel } from './ui';

/**
 * The 16PF question set and the norm table it is scored against (PRD ADM-9). Read-only: both come from the
 * reviewed scoring sources in docs/scoring and change only through a new database migration.
 */
const ANSWER = ['', 'Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];

export const QuestionSetAdmin: React.FC = () => {
  const [tab, setTab] = useState<'items' | 'norms'>('items');
  const [items, setItems] = useState<{ itemSet: { version: string; description: string }; items: ItemRow[] } | null>(null);
  const [norms, setNorms] = useState<NormsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [factor, setFactor] = useState('');

  useEffect(() => {
    Promise.all([siteAdminApi.items(), siteAdminApi.norms()])
      .then(([i, n]) => {
        setItems(i);
        setNorms(n);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load the question set.'));
  }, []);

  const factors = useMemo(() => {
    const seen = new Map<string, string>();
    items?.items.forEach((i) => i.factor && seen.set(i.factor, i.factorName ?? i.factor));
    return [...seen];
  }, [items]);
  const shown = (items?.items ?? []).filter((i) => (factor === '' ? true : factor === 'checks' ? i.attentionCheck : i.factor === factor));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Question set & norms"
        description="The statements of the 16PF test and the norm table its scores are compared with. This is read-only: they come from the reviewed scoring sources and change only through a database update."
      />
      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {(['items', 'norms'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-11 px-4 text-sm font-semibold border-b-2 -mb-px cursor-pointer ${tab === t ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t === 'items' ? `Statements${items ? ` (${items.items.length})` : ''}` : 'Norms'}
          </button>
        ))}
      </div>
      {error && <ErrorBox>{error}</ErrorBox>}
      {!items && !error && <LoadingBlock />}

      {items && tab === 'items' && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-slate-600 flex-1 min-w-[14rem]">
              Active set <strong className="text-slate-800">{items.itemSet.version}</strong>: {items.itemSet.description}
            </p>
            <select aria-label="Show statements for" value={factor} onChange={(e) => setFactor(e.target.value)} className={filterControl}>
              <option value="">All statements</option>
              <option value="checks">Attention checks only</option>
              {factors.map(([code, name]) => (
                <option key={code} value={code}>
                  {code} · {name}
                </option>
              ))}
            </select>
          </div>
          <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden" aria-label="Statements">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-slate-500 bg-slate-50">
                  <tr>
                    <th className="py-2.5 px-5 font-semibold">#</th>
                    <th className="py-2.5 pr-3 font-semibold">Statement</th>
                    <th className="py-2.5 pr-3 font-semibold">Factor</th>
                    <th className="py-2.5 pr-5 font-semibold">Scoring</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 align-top">
                  {shown.map((i) => (
                    <tr key={i.code}>
                      <td className="py-2.5 px-5 text-xs text-slate-400 tabular-nums">{i.position}</td>
                      <td className="py-2.5 pr-3 text-slate-800 min-w-[16rem]">
                        {i.text}
                        <span className="block text-[11px] font-mono text-slate-400">{i.code}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-slate-600 whitespace-nowrap">{i.factor ? `${i.factor} · ${i.factorName}` : '—'}</td>
                      <td className="py-2.5 pr-5 text-xs whitespace-nowrap">
                        {i.attentionCheck ? (
                          <Badge tone="amber">Check: expects “{ANSWER[i.expected ?? 0]}”</Badge>
                        ) : i.keyed === '-' ? (
                          <Badge tone="indigo">Reversed</Badge>
                        ) : (
                          <Badge>Normal</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {norms && tab === 'norms' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Active norms <strong className="text-slate-800">{norms.normSet.version}</strong>: {norms.normSet.source}. Sample of{' '}
            <strong className="text-slate-800">{norms.normSet.sampleSize.toLocaleString()}</strong> people.{' '}
            {norms.normSet.stenMethod === 'table'
              ? `Each trait's sten is read from a table of ${norms.normSet.sampleSize.toLocaleString()} people (standard sten cut-points). The 5 global scores use z = (composite − mean) ÷ SD, then sten = 2z + 5.5.`
              : 'A raw score becomes z = (raw − mean) ÷ SD, then sten = 2z + 5.5, rounded and kept within 1–10.'}
          </p>
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Panel title="16 factors">
              <NormTable
                head={['Factor', 'Mean', 'SD', 'n', 'Reliability (α)']}
                rows={norms.factors.map((f) => [`${f.code} · ${f.name}`, f.mean.toFixed(2), f.sd.toFixed(2), f.n?.toLocaleString() ?? '—', f.alpha?.toFixed(2) ?? '—'])}
              />
            </Panel>
            <Panel title="5 global domains">
              <NormTable head={['Domain', 'Mean', 'SD']} rows={norms.domains.map((d) => [d.name, d.mean.toFixed(2), d.sd.toFixed(2)])} />
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
};

const NormTable: React.FC<{ head: string[]; rows: string[][] }> = ({ head, rows }) => (
  <div className="overflow-x-auto -mx-5">
    <table className="w-full text-xs">
      <thead className="text-left text-slate-500">
        <tr>
          {head.map((h, i) => (
            <th key={h} className={`py-2 font-semibold ${i === 0 ? 'px-5' : 'pr-5 text-right'}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((r) => (
          <tr key={r[0]}>
            {r.map((c, i) => (
              <td key={i} className={`py-2 ${i === 0 ? 'px-5 text-slate-800' : 'pr-5 text-right tabular-nums text-slate-700'}`}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
