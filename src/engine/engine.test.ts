import { describe, expect, it } from 'vitest';
import { MAX_TASKS_PER_PASTE, parseTaskList } from './parse';
import { applyFamiliarity, normalizeRange } from './estimate';
import { coverage, DEFAULT_RUNS, hashSeed, pertMean, sampleTask, summarize, sumRuns } from './simulate';
import { fitToBudget } from './fit';

describe('parseTaskList', () => {
  it('turns lines into tasks and strips bullets and numbering', () => {
    const text = ['- Online menu', '* Order basket', '• Payment with Bancontact', '1. Admin panel', '2) Email receipts', 'a) Opening hours', '[ ] Pickup slots', '', '   '].join('\n');
    expect(parseTaskList(text).names).toEqual([
      'Online menu',
      'Order basket',
      'Payment with Bancontact',
      'Admin panel',
      'Email receipts',
      'Opening hours',
      'Pickup slots',
    ]);
  });

  it('keeps words that merely start with a letter or number', () => {
    expect(parseTaskList('A booking page\n3D product viewer\n2FA for admins').names).toEqual([
      'A booking page',
      '3D product viewer',
      '2FA for admins',
    ]);
  });

  it('drops case-insensitive duplicates, including ones already in the project', () => {
    expect(parseTaskList('Login\nlogin\nLOGIN\nSignup', ['signup']).names).toEqual(['Login']);
  });

  it('caps a paste and reports what it skipped', () => {
    const text = Array.from({ length: MAX_TASKS_PER_PASTE + 5 }, (_, i) => `Task ${i}`).join('\r\n');
    const r = parseTaskList(text);
    expect(r.names).toHaveLength(MAX_TASKS_PER_PASTE);
    expect(r.skipped).toBe(5);
  });
});

describe('estimates', () => {
  it('fills best and worst from familiarity, rounded to half hours', () => {
    expect(applyFamiliarity(10, 'known')).toEqual({ best: 8, worst: 13 });
    expect(applyFamiliarity(10, 'some')).toEqual({ best: 7, worst: 18 });
    expect(applyFamiliarity(10, 'new')).toEqual({ best: 6, worst: 25 });
    expect(applyFamiliarity(3, 'new')).toEqual({ best: 2, worst: 7.5 });
  });

  it('needs likely hours before a task counts', () => {
    expect(normalizeRange({})).toBeNull();
    expect(normalizeRange({ best: 2, worst: 4 })).toBeNull();
    expect(normalizeRange({ likely: 0 })).toBeNull();
  });

  it('sorts out-of-order ranges and flags them', () => {
    expect(normalizeRange({ best: 10, likely: 4, worst: 6 })).toEqual({ range: { min: 4, mode: 6, max: 10 }, reordered: true });
    expect(normalizeRange({ best: 2, likely: 4, worst: 6 })).toEqual({ range: { min: 2, mode: 4, max: 6 }, reordered: false });
    expect(normalizeRange({ likely: 5 })).toEqual({ range: { min: 5, mode: 5, max: 5 }, reordered: false });
  });

  it('clamps absurd inputs', () => {
    expect(normalizeRange({ likely: 10, worst: 100000 })!.range.max).toBe(2000);
  });
});

describe('simulation', () => {
  const r = { min: 6, mode: 10, max: 25 };

  it('stays inside the range and centres on the PERT mean', () => {
    const s = sampleTask(r, DEFAULT_RUNS, 42);
    let lo = Infinity;
    let hi = -Infinity;
    let sum = 0;
    for (const v of s) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
      sum += v;
    }
    expect(lo).toBeGreaterThanOrEqual(6);
    expect(hi).toBeLessThanOrEqual(25);
    expect(Math.abs(sum / s.length - pertMean(r))).toBeLessThan(0.15);
  });

  it('is deterministic for a seed', () => {
    expect(Array.from(sampleTask(r, 100, 7))).toEqual(Array.from(sampleTask(r, 100, 7)));
    expect(Array.from(sampleTask(r, 100, 7))).not.toEqual(Array.from(sampleTask(r, 100, 8)));
  });

  it('handles a zero-width range', () => {
    expect(Array.from(sampleTask({ min: 4, mode: 4, max: 4 }, 5, 1))).toEqual([4, 4, 4, 4, 4]);
  });

  it('percentiles increase with confidence and coverage inverts them', () => {
    const tasks = [r, { min: 2, mode: 3, max: 8 }, { min: 10, mode: 16, max: 40 }];
    const sum = summarize(sumRuns(tasks.map((t, i) => sampleTask(t, DEFAULT_RUNS, hashSeed(`t${i}`))), DEFAULT_RUNS));
    const ps = [0.5, 0.6, 0.7, 0.8, 0.9, 0.95].map((p) => sum.at(p));
    for (let i = 1; i < ps.length; i += 1) expect(ps[i]).toBeGreaterThanOrEqual(ps[i - 1]);
    expect(coverage(sum, sum.at(0.8))).toBeCloseTo(0.8, 2);
    expect(coverage(sum, 0)).toBe(0);
    expect(coverage(sum, 1e9)).toBe(1);
  });

  // spec.md > Decisions and Open Issues: is 10,000 runs enough for a stable quote?
  it('quotes a stable 80th percentile at 10,000 runs (spread under 1% across seeds)', () => {
    const tasks = [
      { min: 6, mode: 10, max: 25 },
      { min: 2, mode: 3, max: 8 },
      { min: 10, mode: 16, max: 40 },
      { min: 4, mode: 5, max: 6.5 },
      { min: 12, mode: 20, max: 50 },
    ];
    const p80s = Array.from({ length: 12 }, (_, seed) =>
      summarize(sumRuns(tasks.map((t, i) => sampleTask(t, DEFAULT_RUNS, hashSeed(`seed${seed}-task${i}`))), DEFAULT_RUNS)).at(0.8),
    );
    const spread = (Math.max(...p80s) - Math.min(...p80s)) / (p80s.reduce((a, b) => a + b, 0) / p80s.length);
    expect(spread).toBeLessThan(0.01);
  });
});

describe('fitToBudget', () => {
  const runs = 4000;
  const make = (entries: Array<[string, number, number, number]>) =>
    new Map(entries.map(([id, min, mode, max]) => [id, sampleTask({ min, mode, max }, runs, hashSeed(id))] as const));
  const samples = make([
    ['design', 8, 12, 20],
    ['menu', 6, 10, 18],
    ['basket', 10, 16, 30],
    ['payments', 8, 14, 40],
    ['admin', 12, 20, 45],
    ['emails', 2, 4, 8],
  ]);
  const ids = [...samples.keys()];
  const at = (set: string[], p: number) => summarize(sumRuns(set.map((id) => samples.get(id)!), runs)).at(p);

  it('says it fits when it does', () => {
    const r = fitToBudget(samples, ids, new Set(), 10_000, 0.8, runs);
    expect(r.status).toBe('fits');
    expect(r.defer).toEqual([]);
  });

  it('defers optional work so the phase-1 percentile fits', () => {
    const budget = at(ids, 0.8) * 0.75;
    const r = fitToBudget(samples, ids, new Set(['design']), budget, 0.8, runs);
    expect(r.status).toBe('defer');
    expect(r.defer.length).toBeGreaterThan(0);
    expect(r.defer).not.toContain('design');
    const kept = ids.filter((id) => !r.defer.includes(id));
    expect(at(kept, 0.8)).toBeLessThanOrEqual(budget);
    expect(r.hoursAtConfidence).toBeCloseTo(at(kept, 0.8), 6);
  });

  it('does not defer more than needed (every deferred task would break the budget if put back)', () => {
    const budget = at(ids, 0.8) * 0.7;
    const r = fitToBudget(samples, ids, new Set(), budget, 0.8, runs);
    const kept = ids.filter((id) => !r.defer.includes(id));
    for (const id of r.defer) expect(at([...kept, id], 0.8)).toBeGreaterThan(budget);
  });

  it('defers close to the least expected work, checked against every subset', () => {
    const budget = at(ids, 0.8) * 0.8;
    const r = fitToBudget(samples, ids, new Set(['design']), budget, 0.8, runs);
    const optional = ids.filter((id) => id !== 'design');
    const mean = (id: string) => samples.get(id)!.reduce((a, b) => a + b, 0) / runs;
    let best = Infinity;
    for (let mask = 1; mask < 1 << optional.length; mask += 1) {
      const removed = optional.filter((_, i) => mask & (1 << i));
      if (at(ids.filter((id) => !removed.includes(id)), 0.8) <= budget) best = Math.min(best, removed.reduce((a, id) => a + mean(id), 0));
    }
    const chosen = r.defer.reduce((a, id) => a + mean(id), 0);
    expect(chosen).toBeLessThanOrEqual(best + 0.5);
  });

  it('never defers pinned tasks and reports when pinned work alone is too much', () => {
    const r = fitToBudget(samples, ids, new Set(['admin', 'payments']), 30, 0.8, runs);
    expect(r.status).toBe('impossible');
    expect(r.pinnedHoursAtConfidence).toBeGreaterThan(30);
  });

  it('stays fast with 40 tasks', () => {
    const many = new Map(
      Array.from({ length: 40 }, (_, i) => [`task${i}`, sampleTask({ min: 2 + (i % 7), mode: 4 + (i % 9), max: 10 + (i % 13) * 2 }, 10_000, hashSeed(`task${i}`))] as const),
    );
    const all = [...many.keys()];
    const full = summarize(sumRuns(all.map((id) => many.get(id)!), 10_000)).at(0.9);
    const t0 = performance.now();
    const r = fitToBudget(many, all, new Set(all.slice(0, 10)), full * 0.7, 0.9, 10_000);
    const ms = performance.now() - t0;
    expect(r.status).toBe('defer');
    expect(r.hoursAtConfidence).toBeLessThanOrEqual(full * 0.7);
    expect(ms).toBeLessThan(1500);
  });

  it('handles an empty phase 1', () => {
    expect(fitToBudget(samples, [], new Set(), 10, 0.8, runs).status).toBe('empty');
  });
});
