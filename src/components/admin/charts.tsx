import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Table2 } from 'lucide-react';

/**
 * Hand-drawn admin charts (owner decision: no chart library). Rules from the dataviz guide:
 * thin bars (≤ 24px) with a 4px rounded data-end on a single baseline, 2px surface gaps between stacked
 * segments, hairline grid, text in ink colours (never the series colour), a legend whenever there are two
 * or more series, a hover/focus tooltip that never gates (every chart has a table view), fixed series order.
 *
 * Program colours (validated for colour-vision deficiency, light surface): STI teal-600, PTI indigo-500,
 * TTI amber-500. Amber has < 3:1 contrast, so values are always also in labels / the table.
 */
export const SERIES_COLORS = { STI: '#0d9488', PTI: '#6366f1', TTI: '#f59e0b' } as const;
export const SINGLE = '#0d9488';
const GRID = '#e2e8f0';

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));

/** A clean rounded maximum for the y axis (1, 2, 5 × 10ⁿ). */
function niceMax(v: number): number {
  if (v <= 4) return Math.max(1, v);
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 2.5, 5, 10].map((m) => m * p).find((m) => m >= v) ?? v;
}

/** Card with a title and a "Table" toggle, so every value is reachable without hovering. */
export const ChartCard: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  table: { head: string[]; rows: (string | number)[][] };
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, table, children, className = '' }) => {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={`bg-white rounded-2xl border border-slate-200 shadow-xs p-5 flex flex-col ${className}`} aria-label={title}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
          className="shrink-0 inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
        >
          <Table2 className="w-3.5 h-3.5" aria-hidden="true" /> {asTable ? 'Chart' : 'Table'}
        </button>
      </div>
      {asTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500">
                {table.head.map((h, i) => (
                  <th key={h} className={`py-1.5 pr-3 font-semibold ${i > 0 ? 'text-right' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} className={`py-1.5 pr-3 text-slate-700 ${j > 0 ? 'text-right tabular-nums' : ''}`}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1">{children}</div>
      )}
    </section>
  );
};

export const Legend: React.FC<{ items: { label: string; color: string }[] }> = ({ items }) => (
  <ul className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-xs text-slate-600">
    {items.map((i) => (
      <li key={i.label} className="inline-flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: i.color }} aria-hidden="true" />
        {i.label}
      </li>
    ))}
  </ul>
);

/**
 * Stacked columns over time (e.g. registrations per day by program). Each column is a focusable hit target
 * with a tooltip listing every series for that day.
 */
export function StackedColumns<K extends string>({
  data,
  series,
  xLabel,
}: {
  data: ({ day: string } & Record<K, number>)[];
  series: { key: K; label: string; color: string }[];
  xLabel: (day: string) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const titleId = useId();
  // Drawn at the card's real width (1 unit = 1px), so labels stay 10px on a phone instead of shrinking.
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(640);
  const long = data.length > 31; // e.g. 90 days: keep the bars readable and scroll inside the card instead
  const empty = data.every((d) => series.every((s) => !(d[s.key] ?? 0)));
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setW(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [empty]);
  const H = 200;
  const pad = { l: 28, r: 4, t: 8, b: 22 };
  const totals = data.map((d) => series.reduce((n, s) => n + (d[s.key] ?? 0), 0));
  const max = niceMax(Math.max(0, ...totals));
  const band = (W - pad.l - pad.r) / Math.max(1, data.length);
  const barW = Math.min(24, Math.max(2, band - 2));
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [...new Set([0, max / 2, max].map((t) => Math.round(t)))]; // no repeated tick when max is 1
  const labelEvery = Math.ceil(data.length / 6);

  if (empty) {
    return <p className="py-12 text-center text-xs text-slate-400">Nothing recorded for these days yet.</p>;
  }

  return (
    <div onMouseLeave={() => setActive(null)}>
      {series.length > 1 && <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />}
      {/* Long ranges below ~560px scroll inside their card instead of squeezing the bars; the tooltip scrolls with them. */}
      <div className="overflow-x-auto -mx-1 px-1">
      <div ref={boxRef} className={`relative ${long ? 'min-w-[560px]' : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="group" aria-labelledby={titleId}>
        <title id={titleId}>{`Columns per day from ${data[0]?.day ?? ''} to ${data[data.length - 1]?.day ?? ''}; open the table for exact values.`}</title>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth={1} />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" className="fill-slate-400" fontSize={10}>
              {fmt(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.l + i * band + (band - barW) / 2;
          let acc = 0;
          const segs = series
            .map((s) => ({ s, v: d[s.key] ?? 0 }))
            .filter((p) => p.v > 0)
            .map((p, j, all) => {
              const y0 = y(acc);
              acc += p.v;
              const y1 = y(acc);
              const top = j === all.length - 1;
              const h = Math.max(0, y0 - y1 - (top ? 0 : 2)); // 2px surface gap between segments
              return { ...p, y: y1 + (top ? 0 : 2), h, top };
            });
          return (
            <g key={d.day}>
              {segs.map((g) =>
                g.top ? (
                  // Rounded data-end (4px), square at the baseline.
                  <path
                    key={g.s.key}
                    d={`M${x},${g.y + g.h} V${g.y + Math.min(4, g.h)} Q${x},${g.y} ${x + Math.min(4, barW / 2)},${g.y} H${x + barW - Math.min(4, barW / 2)} Q${x + barW},${g.y} ${x + barW},${g.y + Math.min(4, g.h)} V${g.y + g.h} Z`}
                    fill={g.s.color}
                    opacity={active === null || active === i ? 1 : 0.55}
                  />
                ) : (
                  <rect key={g.s.key} x={x} y={g.y} width={barW} height={g.h} fill={g.s.color} opacity={active === null || active === i ? 1 : 0.55} />
                ),
              )}
              {/* Hit target: the whole band, taller than the mark. */}
              <rect
                x={pad.l + i * band}
                y={pad.t}
                width={band}
                height={H - pad.t - pad.b}
                fill="transparent"
                // Every column is focusable for short ranges; long ranges rely on the table view instead.
                tabIndex={data.length <= 31 ? 0 : -1}
                role="img"
                aria-label={`${xLabel(d.day)}: ${series.map((s) => `${s.label} ${d[s.key] ?? 0}`).join(', ')}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="outline-hidden focus-visible:stroke-teal-500"
              />
              {i % labelEvery === 0 && (
                <text x={pad.l + i * band + band / 2} y={H - 6} textAnchor="middle" className="fill-slate-400" fontSize={10}>
                  {xLabel(d.day)}
                </text>
              )}
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="#cbd5e1" strokeWidth={1} />
      </svg>
      {active !== null && data[active] && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs"
          style={{ left: `clamp(0px, calc(${((pad.l + (active + 0.5) * band) / W) * 100}% - 70px), calc(100% - 150px))`, top: 4 }}
          role="status"
        >
          <p className="font-semibold text-slate-500 mb-1">{xLabel(data[active].day)}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-1.5 text-slate-500">
                <span className="w-3 h-0.5 rounded" style={{ background: s.color }} aria-hidden="true" />
                {s.label}
              </span>
              <strong className="text-slate-900 tabular-nums">{data[active][s.key] ?? 0}</strong>
            </p>
          ))}
          {series.length > 1 && (
            <p className="flex justify-between gap-4 border-t border-slate-100 mt-1 pt-1">
              <span className="text-slate-500">Total</span>
              <strong className="text-slate-900 tabular-nums">{totals[active]}</strong>
            </p>
          )}
        </div>
      )}
      </div>
      </div>
    </div>
  );
}

/**
 * Horizontal bars for a breakdown (one series): the label on the left, the value at the bar's tip, the share
 * of the total on hover/focus. Bars are 12px with a rounded end, on one baseline.
 */
export const BarList: React.FC<{ items: { label: string; count: number; color?: string }[]; total?: number; empty?: string; showShare?: boolean }> = ({
  items,
  total,
  empty = 'Nothing to show for these filters.',
  showShare = true,
}) => {
  const max = useMemo(() => Math.max(1, ...items.map((i) => i.count)), [items]);
  const sum = total ?? items.reduce((n, i) => n + i.count, 0);
  if (items.length === 0 || items.every((i) => i.count === 0)) return <p className="text-xs text-slate-400 py-6 text-center">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((i) => {
        const share = sum ? Math.round((i.count / sum) * 100) : 0;
        return (
          <li key={i.label} className="grid grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-3 text-xs" title={showShare ? `${i.label}: ${i.count} (${share}%)` : `${i.label}: ${i.count}`}>
            <span className="text-slate-600 truncate">{i.label}</span>
            <span className="flex items-center gap-2 min-w-0">
              {/* The bar grows inside its own track, so the count and share always keep their room inside the card. */}
              <span className="flex-1 min-w-0">
                <span
                  className="block h-3 rounded-r-[4px]"
                  style={{ width: `${(i.count / max) * 100}%`, minWidth: i.count ? 3 : 0, background: i.color ?? SINGLE }}
                />
              </span>
              <span className="shrink-0 text-slate-800 font-semibold tabular-nums">{fmt(i.count)}</span>
              {showShare && <span className="shrink-0 w-9 text-right text-slate-400 tabular-nums hidden sm:inline">{share}%</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
};
