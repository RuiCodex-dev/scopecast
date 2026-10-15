import type { Range } from './simulate';

export type Familiarity = 'known' | 'some' | 'new' | 'custom';

export const MAX_TASK_HOURS = 2000;

export const FAMILIARITY: Record<Exclude<Familiarity, 'custom'>, { label: string; hint: string; low: number; high: number }> = {
  known: { label: 'Known', hint: 'Done this before, few surprises', low: 0.8, high: 1.3 },
  some: { label: 'Some unknowns', hint: 'Familiar, but a few open questions', low: 0.7, high: 1.8 },
  new: { label: 'New territory', hint: 'First time, or depends on others', low: 0.6, high: 2.5 },
};

export const roundHalf = (n: number): number => Math.round(n * 2) / 2;

export const clampHours = (n: number): number => Math.min(MAX_TASK_HOURS, Math.max(0, n));

/** Best and worst hours implied by a familiarity preset and a likely value. */
export function applyFamiliarity(likely: number, familiarity: Exclude<Familiarity, 'custom'>): { best: number; worst: number } {
  const preset = FAMILIARITY[familiarity];
  return {
    best: clampHours(roundHalf(likely * preset.low)),
    worst: clampHours(roundHalf(likely * preset.high)),
  };
}

export interface EstimateInput {
  best?: number;
  likely?: number;
  worst?: number;
}

export interface NormalizedRange {
  range: Range;
  /** True when the three numbers were not entered in best <= likely <= worst order. */
  reordered: boolean;
}

const isNum = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * Turns user input into a usable range, or null when the task has no likely hours yet.
 * Missing best or worst fall back to the likely value; out-of-order values are sorted.
 */
export function normalizeRange(input: EstimateInput): NormalizedRange | null {
  if (!isNum(input.likely) || input.likely <= 0) return null;
  const likely = clampHours(input.likely);
  const best = isNum(input.best) ? clampHours(input.best) : likely;
  const worst = isNum(input.worst) ? clampHours(input.worst) : likely;
  const reordered = best > likely || likely > worst;
  const [min, mode, max] = [best, likely, worst].sort((a, b) => a - b);
  return { range: { min, mode, max }, reordered };
}
