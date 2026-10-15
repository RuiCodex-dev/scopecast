/**
 * Monte Carlo simulation of a project made of independent tasks, each estimated
 * with a three-point (best / likely / worst) range and sampled from a PERT
 * distribution. Everything here is pure and deterministic for a given seed.
 */

export const DEFAULT_RUNS = 10_000;
export const PERT_LAMBDA = 4;

/** A task range already sorted so that min <= mode <= max. */
export interface Range {
  min: number;
  mode: number;
  max: number;
}

/** mulberry32: a tiny, fast, seedable PRNG returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a hash of a string, used to derive stable per-task seeds. */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function standardNormal(rand: () => number): number {
  // Box-Muller; guard against log(0).
  let u = 0;
  while (u === 0) u = rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Gamma(shape, 1) sample using Marsaglia-Tsang (with the shape < 1 boost). */
export function sampleGamma(shape: number, rand: () => number): number {
  if (shape < 1) {
    const u = rand();
    return sampleGamma(shape + 1, rand) * Math.pow(u === 0 ? Number.MIN_VALUE : u, 1 / shape);
  }
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x: number;
    let v: number;
    do {
      x = standardNormal(rand);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand();
    if (u < 1 - 0.0331 * x * x * x * x) return d * v;
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}

export function sampleBeta(alpha: number, beta: number, rand: () => number): number {
  const x = sampleGamma(alpha, rand);
  const y = sampleGamma(beta, rand);
  return x / (x + y);
}

/** PERT shape parameters for a range. */
export function pertShape(r: Range, lambda = PERT_LAMBDA): { alpha: number; beta: number } {
  const span = r.max - r.min;
  const alpha = 1 + (lambda * (r.mode - r.min)) / span;
  const beta = 1 + (lambda * (r.max - r.mode)) / span;
  return { alpha, beta };
}

/** Expected value of a PERT distribution. */
export function pertMean(r: Range, lambda = PERT_LAMBDA): number {
  return (r.min + lambda * r.mode + r.max) / (lambda + 2);
}

/** Draws `runs` samples (hours) for one task. */
export function sampleTask(r: Range, runs: number, seed: number): Float64Array {
  const out = new Float64Array(runs);
  if (!(r.max > r.min)) {
    out.fill(r.mode);
    return out;
  }
  const rand = mulberry32(seed);
  const { alpha, beta } = pertShape(r);
  const span = r.max - r.min;
  for (let i = 0; i < runs; i += 1) out[i] = r.min + span * sampleBeta(alpha, beta, rand);
  return out;
}

/** Adds per-task sample arrays run by run. */
export function sumRuns(samples: readonly Float64Array[], runs: number): Float64Array {
  const total = new Float64Array(runs);
  for (const s of samples) for (let i = 0; i < runs; i += 1) total[i] += s[i];
  return total;
}

export interface Summary {
  runs: number;
  /** Totals sorted ascending. */
  sorted: Float64Array;
  mean: number;
  /** Hours at a cumulative probability p in [0, 1]. */
  at: (p: number) => number;
}

export function summarize(totals: Float64Array): Summary {
  const sorted = Float64Array.from(totals).sort();
  const runs = sorted.length;
  let sum = 0;
  for (let i = 0; i < runs; i += 1) sum += sorted[i];
  const at = (p: number): number => {
    if (runs === 0) return 0;
    const clamped = Math.min(1, Math.max(0, p));
    // Nearest-rank percentile: the smallest value with at least p of runs at or below it.
    const idx = Math.min(runs - 1, Math.max(0, Math.ceil(clamped * runs) - 1));
    return sorted[idx];
  };
  return { runs, sorted, mean: runs ? sum / runs : 0, at };
}

/** Share of runs whose total is at or below `limit`. */
export function coverage(summary: Summary, limit: number): number {
  const { sorted, runs } = summary;
  if (runs === 0) return 0;
  let lo = 0;
  let hi = runs;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] <= limit) lo = mid + 1;
    else hi = mid;
  }
  return lo / runs;
}
