import { useMemo, useRef } from 'react';
import { normalizeRange, type NormalizedRange } from '../engine/estimate';
import { fitToBudget, type FitResult } from '../engine/fit';
import { coverage, DEFAULT_RUNS, hashSeed, sampleTask, summarize, sumRuns, type Summary } from '../engine/simulate';
import type { Project } from './types';

export const RUNS = DEFAULT_RUNS;

/** Price rounding: quotes are rounded up to the next EUR 50. */
export const PRICE_STEP = 50;
export const priceFor = (hours: number, rate: number): number => Math.ceil((hours * rate) / PRICE_STEP - 1e-9) * PRICE_STEP;
export const daysFor = (hours: number, hoursPerDay: number): number => Math.max(hours > 0 ? 1 : 0, Math.ceil(hours / hoursPerDay - 1e-9));
/** The largest number of hours whose rounded price stays within the budget. */
export const hoursWithin = (budget: number, rate: number): number => (rate > 0 ? (Math.floor(budget / PRICE_STEP) * PRICE_STEP) / rate : Infinity);

export interface Forecast {
  ranges: Map<string, NormalizedRange>;
  samples: Map<string, Float64Array>;
  phase1: Summary | null;
  phase2: Summary | null;
  estimated: number;
  needsHours: number;
  /** p in [0, 1] */
  p: number;
  hours: number;
  median: number;
  budget: { coverage: number; fit: FitResult } | null;
}

export function useForecast(project: Project): Forecast {
  const cache = useRef(new Map<string, { key: string; samples: Float64Array }>());

  const { ranges, samples } = useMemo(() => {
    const ranges = new Map<string, NormalizedRange>();
    const samples = new Map<string, Float64Array>();
    for (const t of project.tasks) {
      const n = normalizeRange(t);
      if (!n) continue;
      ranges.set(t.id, n);
      const key = `${n.range.min}|${n.range.mode}|${n.range.max}`;
      const hit = cache.current.get(t.id);
      if (hit && hit.key === key) {
        samples.set(t.id, hit.samples);
      } else {
        // Seeded by task id: editing a task keeps its random stream, so numbers move smoothly.
        const s = sampleTask(n.range, RUNS, hashSeed(t.id));
        cache.current.set(t.id, { key, samples: s });
        samples.set(t.id, s);
      }
    }
    return { ranges, samples };
  }, [project.tasks]);

  const { phase1, phase2, phase1Ids } = useMemo(() => {
    const ids1 = project.tasks.filter((t) => t.phase === 1 && samples.has(t.id)).map((t) => t.id);
    const ids2 = project.tasks.filter((t) => t.phase === 2 && samples.has(t.id)).map((t) => t.id);
    const sum = (ids: string[]) => (ids.length ? summarize(sumRuns(ids.map((id) => samples.get(id)!), RUNS)) : null);
    return { phase1: sum(ids1), phase2: sum(ids2), phase1Ids: ids1 };
  }, [project.tasks, samples]);

  const p = project.confidence / 100;

  const budget = useMemo(() => {
    if (!phase1 || project.budget === undefined || project.rate <= 0) return null;
    const limit = hoursWithin(project.budget, project.rate);
    const pinned = new Set(project.tasks.filter((t) => t.pinned).map((t) => t.id));
    return {
      coverage: coverage(phase1, limit),
      fit: fitToBudget(samples, phase1Ids, pinned, limit, p, RUNS),
    };
  }, [phase1, phase1Ids, samples, project.budget, project.rate, project.tasks, p]);

  const phase1Tasks = project.tasks.filter((t) => t.phase === 1);
  return {
    ranges,
    samples,
    phase1,
    phase2,
    estimated: phase1Ids.length,
    needsHours: phase1Tasks.filter((t) => !ranges.has(t.id)).length,
    p,
    hours: phase1 ? phase1.at(p) : 0,
    median: phase1 ? phase1.at(0.5) : 0,
    budget,
  };
}
