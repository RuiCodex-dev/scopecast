import type { Summary } from '../engine/simulate';
import { formatHours } from './format';

interface Props {
  summary: Summary;
  p: number;
  budgetHours?: number;
  budgetFits?: boolean;
}

const W = 480;
const H = 236;
const M = { left: 40, right: 14, top: 14, bottom: 34 };

function niceTicks(lo: number, hi: number, count = 5): number[] {
  const span = hi - lo;
  if (span <= 0) return [lo];
  const raw = span / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => span / s <= count) ?? 10 * pow;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) ticks.push(v);
  return ticks;
}

/** Cumulative "chance of finishing within N hours" curve, Tufte-quiet. */
export function ForecastCurve({ summary, p, budgetHours, budgetFits }: Props) {
  const lo0 = summary.at(0.001);
  const hi0 = summary.at(0.999);
  const pad = Math.max((hi0 - lo0) * 0.06, 1);
  const lo = Math.max(0, lo0 - pad);
  const hi = hi0 + pad;
  const x = (h: number) => M.left + ((Math.min(hi, Math.max(lo, h)) - lo) / (hi - lo)) * (W - M.left - M.right);
  const y = (q: number) => H - M.bottom - q * (H - M.top - M.bottom);

  const pts: string[] = [];
  const N = 140;
  for (let i = 0; i <= N; i += 1) {
    const q = 0.001 + (0.998 * i) / N;
    pts.push(`${x(summary.at(q)).toFixed(1)},${y(q).toFixed(1)}`);
  }
  const hours = summary.at(p);
  const p10 = summary.at(0.1);
  const p90 = summary.at(0.9);
  const median = summary.at(0.5);
  const ticks = niceTicks(lo, hi);
  const showBudget = budgetHours !== undefined && Number.isFinite(budgetHours);
  const budgetColor = budgetFits ? 'var(--sage)' : 'var(--ochre-line)';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Chance of finishing within a number of hours. ${Math.round(p * 100)}% chance within ${formatHours(hours)} hours.`}>
      {/* 10th-90th percentile band */}
      <rect x={x(p10)} y={M.top} width={Math.max(0, x(p90) - x(p10))} height={H - M.top - M.bottom} fill="var(--paper-deep)" />
      <text x={(x(p10) + x(p90)) / 2} y={M.top + 12} textAnchor="middle" fontSize="10.5" fill="var(--graphite)" letterSpacing="0.04em">
        LIKELY RANGE
      </text>

      {/* grid */}
      {[0, 0.5, 1].map((q) => (
        <g key={q}>
          <line x1={M.left} x2={W - M.right} y1={y(q)} y2={y(q)} stroke="var(--rule-soft)" strokeWidth="1" />
          <text x={M.left - 8} y={y(q) + 4} textAnchor="end" fontSize="11" fill="var(--graphite)">
            {Math.round(q * 100)}%
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={H - M.bottom} y2={H - M.bottom + 4} stroke="var(--graphite)" strokeWidth="1" />
          <text x={x(t)} y={H - M.bottom + 17} textAnchor="middle" fontSize="11" fill="var(--graphite)">
            {formatHours(t)}
          </text>
        </g>
      ))}
      <text x={W - M.right} y={H - 3} textAnchor="end" fontSize="10.5" fill="var(--graphite)">
        hours
      </text>

      {/* median tick */}
      <line x1={x(median)} x2={x(median)} y1={y(0.5) - 5} y2={y(0.5) + 5} stroke="var(--ink)" strokeWidth="1" />

      {/* budget */}
      {showBudget && budgetHours! > lo && budgetHours! < hi && (
        <g>
          <line x1={x(budgetHours!)} x2={x(budgetHours!)} y1={M.top} y2={H - M.bottom} stroke={budgetColor} strokeWidth="1.5" strokeDasharray="5 4" />
          <text x={x(budgetHours!) + 5} y={M.top + 28} fontSize="11" fill={budgetColor}>
            budget
          </text>
        </g>
      )}

      {/* the curve */}
      <polyline points={pts.join(' ')} fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

      {/* confidence marker */}
      <line x1={M.left} x2={x(hours)} y1={y(p)} y2={y(p)} stroke="var(--terracotta)" strokeWidth="1.2" strokeDasharray="2 3" />
      <line x1={x(hours)} x2={x(hours)} y1={y(p)} y2={H - M.bottom} stroke="var(--terracotta)" strokeWidth="1.2" strokeDasharray="2 3" />
      <circle cx={x(hours)} cy={y(p)} r="5" fill="var(--terracotta)" stroke="var(--paper)" strokeWidth="2" />
      <text x={x(hours) - 10} y={y(p) - 10} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--terracotta-deep)" stroke="var(--paper)" strokeWidth="4" paintOrder="stroke">
        {Math.round(p * 100)}% · {formatHours(hours)} h
      </text>
    </svg>
  );
}
