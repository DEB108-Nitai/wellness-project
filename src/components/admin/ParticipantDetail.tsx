import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react';
import { ParticipantDetail as Detail, participantsApi } from '../../api/admin';
import { ApiError } from '../../api/client';
import { EDUCATION_LABELS } from '../../api/assessment';
import { fmtDateTime, STATUS_LABEL } from './ParticipantsAdmin';
import { Badge, ErrorBox, LoadingBlock, Panel } from './ui';

/** One assessment in full: who, demographics, timing, quality, the 16 factors, the 5 domains and every answer. */
const ANSWER = ['', 'Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
const GENDER: Record<string, string> = { female: 'Female', male: 'Male', non_binary: 'Non-binary', prefer_not_to_say: 'Prefers not to say', self_describe: 'Self-described' };
const EDUCATION: Record<string, string> = EDUCATION_LABELS;

/** A compact sten scale 1–10: the low-average-high bands as a track, the score as a dot. */
const StenRow: React.FC<{ name: string; low?: string; high?: string; sten: number; band: string }> = ({ name, low, high, sten, band }) => (
  <li className="grid grid-cols-[minmax(0,11rem)_1fr_2rem] items-center gap-3 py-1.5">
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-800 truncate">{name}</p>
      {low && high && (
        <p className="text-[10px] text-slate-400 truncate">
          {low} ↔ {high}
        </p>
      )}
    </div>
    <div className="relative h-2.5 rounded-full bg-slate-100" role="img" aria-label={`${name}: sten ${sten} of 10 (${band})`}>
      {/* average band 4–7 */}
      <span className="absolute inset-y-0 rounded-full bg-slate-200" style={{ left: '30%', width: '40%' }} />
      <span
        className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full ring-2 ring-white ${band === 'average' ? 'bg-slate-500' : 'bg-teal-600'}`}
        style={{ left: `${((sten - 0.5) / 10) * 100}%` }}
      />
    </div>
    <span className="text-xs font-bold text-slate-900 tabular-nums text-right">{sten}</span>
  </li>
);

export const ParticipantDetail: React.FC = () => {
  const { ref = '' } = useParams();
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answerFilter, setAnswerFilter] = useState<'all' | 'checks' | 'unanswered'>('all');

  useEffect(() => {
    let alive = true;
    setD(null);
    setError(null);
    participantsApi
      .detail(ref)
      .then((r) => alive && setD(r))
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : 'Could not load this assessment.'));
    return () => {
      alive = false;
    };
  }, [ref]);

  const items = useMemo(
    () =>
      (d?.items ?? []).filter((i) => (answerFilter === 'checks' ? i.attentionCheck : answerFilter === 'unanswered' ? i.answer === null : true)),
    [d, answerFilter],
  );

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/admin/participants" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All participants
        </Link>
        <ErrorBox>{error}</ErrorBox>
      </div>
    );
  }
  if (!d) return <LoadingBlock />;

  const q = d.quality;
  const demo = d.demographics;

  return (
    <div className="space-y-6">
      <Link to="/admin/participants" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All participants
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs font-mono font-bold text-slate-500">{d.ref}</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading">
            {d.person ? d.person.name : `Guest${d.nickname ? ` · ${d.nickname}` : ''}`}
          </h1>
          <p className="text-sm text-slate-600">
            {d.person ? (d.person.email ?? 'Anonymised account') : 'Took the test without an account'}
            {d.nickname && d.person ? ` · nickname “${d.nickname}”` : ''}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge tone={STATUS_LABEL[d.status].tone}>{STATUS_LABEL[d.status].label}</Badge>
            {d.flagged === true && <Badge tone="amber">Flagged for review</Badge>}
            {d.flagged === false && <Badge tone="teal">Quality checks passed</Badge>}
          </div>
        </div>
        {d.status === 'completed' && (
          <a
            href={`/results/${d.ref}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 self-start sm:self-auto"
          >
            Open the full report <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="About the person">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Age', demo.age ?? '—'],
              ['Country', demo.country ?? '—'],
              ['Gender', demo.gender === 'self_describe' ? demo.genderText ?? 'Self-described' : demo.gender ? GENDER[demo.gender] ?? demo.gender : '—'],
              ['Education', demo.education ? EDUCATION[demo.education] ?? demo.education : '—'],
              ['Occupation', demo.occupation ?? '—'],
              ['Consent given', fmtDateTime(d.consentAt)],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <dt className="text-slate-400">{k}</dt>
                <dd className="font-semibold text-slate-800 break-words">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Timing">
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Started', fmtDateTime(d.startedAt)],
              ['Completed', fmtDateTime(d.completedAt)],
              ['Active time', `${d.activeMinutes} min`],
              ['Answered', `${d.answeredCount} of ${d.totalItems}`],
              ['Last activity', fmtDateTime(d.lastActivityAt)],
              ['Norms', d.normVersion ?? '—'],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <dt className="text-slate-400">{k}</dt>
                <dd className="font-semibold text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Response quality">
          {q ? (
            <div className="space-y-2 text-xs">
              <p className={`flex items-center gap-1.5 font-semibold ${q.flagged ? 'text-amber-700' : 'text-teal-700'}`}>
                {q.flagged ? <AlertTriangle className="w-4 h-4" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                {q.flagged ? 'Flagged: read these results with care' : 'No quality concerns'}
              </p>
              <ul className="space-y-1 text-slate-600">
                <li>Attention checks failed: {q.attentionChecksFailed ?? 0} of 3</li>
                {q.straightLineRatio !== undefined && <li>Same answer on {Math.round(q.straightLineRatio * 100)}% of statements</li>}
                {q.tooFast && <li>Finished faster than the minimum time</li>}
                {(q.notes ?? []).map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-slate-500">Checked when the test is submitted.</p>
          )}
        </Panel>
      </div>

      {d.report && (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <Panel title="16 personality factors (sten 1–10)">
            <ul className="divide-y divide-slate-50">
              {d.report.factors.map((f) => (
                <StenRow key={f.factorCode} name={`${f.factorCode} · ${f.factorName}`} low={f.lowLabel} high={f.highLabel} sten={f.sten} band={f.band} />
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-400">Grey zone = average range (4–7). Teal dot = a low or high score.</p>
          </Panel>
          <Panel title="5 global domains">
            <ul className="divide-y divide-slate-50">
              {d.report.domains.map((g) => (
                <StenRow key={g.code} name={g.name} sten={g.sten} band={g.band} />
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <Panel
        title={`Answers (${d.answeredCount} of ${d.totalItems})`}
        actions={
          <select aria-label="Show answers" value={answerFilter} onChange={(e) => setAnswerFilter(e.target.value as typeof answerFilter)} className="h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs">
            <option value="all">All statements</option>
            <option value="checks">Attention checks only</option>
            <option value="unanswered">Not answered</option>
          </select>
        }
      >
        <div className="overflow-x-auto -mx-5">
          <table className="w-full text-xs">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-2 px-5 font-semibold">#</th>
                <th className="py-2 pr-3 font-semibold">Statement</th>
                <th className="py-2 pr-3 font-semibold">Factor</th>
                <th className="py-2 pr-5 font-semibold">Answer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((i) => (
                <tr key={i.position} className={i.attentionFailed ? 'bg-amber-50' : ''}>
                  <td className="py-2 px-5 text-slate-400 tabular-nums">{i.position}</td>
                  <td className="py-2 pr-3 text-slate-700">
                    {i.text}
                    {i.attentionCheck && (
                      <span className={`ml-1.5 text-[10px] font-bold ${i.attentionFailed ? 'text-amber-700' : 'text-slate-400'}`}>
                        {i.attentionFailed ? `ATTENTION CHECK FAILED (expected ${ANSWER[i.expected ?? 0]})` : 'attention check'}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-slate-500 whitespace-nowrap">{i.factor ? `${i.factor}${i.keyed === '-' ? ' (reversed)' : ''}` : '—'}</td>
                  <td className="py-2 pr-5 whitespace-nowrap font-semibold text-slate-800">{i.answer ? `${i.answer} · ${ANSWER[i.answer]}` : <span className="text-slate-400 font-normal">—</span>}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    Nothing to show.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};
