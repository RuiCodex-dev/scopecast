import { summarize, sumRuns } from './simulate';

export type FitStatus = 'fits' | 'defer' | 'impossible' | 'empty';

export interface FitResult {
  status: FitStatus;
  /** Task ids suggested for phase 2, largest first. */
  defer: string[];
  /** Phase-1 hours at the confidence after the suggestion (or as-is when it already fits). */
  hoursAtConfidence: number;
  /** Phase-1 hours at the confidence with only pinned tasks (for the impossible message). */
  pinnedHoursAtConfidence: number;
}

function meanOf(a: Float64Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i += 1) s += a[i];
  return a.length ? s / a.length : 0;
}

/** Limits that keep the search instant in the browser, even with 40 tasks. */
const MAX_VISITED = 20_000;
const MAX_CHECKS = 600;

interface Node {
  sum: number;
  /** Indices into the ascending-by-mean optional list; the last one is the largest. */
  picks: number[];
}

/** A small binary min-heap on `sum`. */
class Heap {
  private items: Node[] = [];
  get size() {
    return this.items.length;
  }
  push(n: Node) {
    const a = this.items;
    a.push(n);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].sum <= a[i].sum) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): Node | undefined {
    const a = this.items;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop()!;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < a.length && a[l].sum < a[m].sum) m = l;
        if (r < a.length && a[r].sum < a[m].sum) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

/**
 * Chooses phase-1 tasks to defer so that the chosen share of simulated runs fits the budget,
 * deferring as little expected work as possible. Pinned tasks are never deferred.
 *
 * Subsets of optional tasks are visited in increasing order of the expected hours they remove
 * (a best-first enumeration), and each plausible one is checked against the real simulated runs.
 * The first subset that fits is therefore the one that defers the least expected work.
 */
export function fitToBudget(
  samplesById: ReadonlyMap<string, Float64Array>,
  phase1Ids: readonly string[],
  pinnedIds: ReadonlySet<string>,
  budgetHours: number,
  confidence: number,
  runs: number,
): FitResult {
  const ids = phase1Ids.filter((id) => samplesById.has(id));
  const hoursFor = (set: readonly string[]): number =>
    set.length === 0 ? 0 : summarize(sumRuns(set.map((id) => samplesById.get(id)!), runs)).at(confidence);

  if (ids.length === 0) return { status: 'empty', defer: [], hoursAtConfidence: 0, pinnedHoursAtConfidence: 0 };

  const pinned = ids.filter((id) => pinnedIds.has(id));
  const pinnedHours = hoursFor(pinned);
  const total = sumRuns(ids.map((id) => samplesById.get(id)!), runs);
  const current = summarize(total).at(confidence);
  if (current <= budgetHours) return { status: 'fits', defer: [], hoursAtConfidence: current, pinnedHoursAtConfidence: pinnedHours };
  if (pinnedHours > budgetHours) return { status: 'impossible', defer: [], hoursAtConfidence: current, pinnedHoursAtConfidence: pinnedHours };

  const means = new Map(ids.map((id) => [id, meanOf(samplesById.get(id)!)] as const));
  const optional = ids.filter((id) => !pinnedIds.has(id)).sort((a, b) => means.get(a)! - means.get(b)!);
  const weight = optional.map((id) => means.get(id)!);
  const byMeanDesc = (a: string, b: string) => means.get(b)! - means.get(a)!;

  // Hours at the confidence with `removed` taken out, using the precomputed total.
  const scratch = new Float64Array(runs);
  const hoursWithout = (removed: readonly string[]): number => {
    scratch.set(total);
    for (const id of removed) {
      const s = samplesById.get(id)!;
      for (let i = 0; i < runs; i += 1) scratch[i] -= s[i];
    }
    return summarize(scratch).at(confidence);
  };

  // Skip subsets that remove far too little to matter: removing m expected hours does not move a
  // high percentile by more than about twice m in practice. This only saves simulation checks.
  const needed = current - budgetHours;

  const heap = new Heap();
  if (optional.length > 0) heap.push({ sum: weight[0], picks: [0] });
  let visited = 0;
  let checks = 0;
  while (heap.size > 0 && visited < MAX_VISITED && checks < MAX_CHECKS) {
    const node = heap.pop()!;
    visited += 1;
    const last = node.picks[node.picks.length - 1];
    if (last + 1 < optional.length) {
      // Children: extend with the next task, or swap the last task for the next one.
      heap.push({ sum: node.sum + weight[last + 1], picks: [...node.picks, last + 1] });
      heap.push({ sum: node.sum - weight[last] + weight[last + 1], picks: [...node.picks.slice(0, -1), last + 1] });
    }
    if (node.sum * 2 < needed) continue;
    checks += 1;
    const removed = node.picks.map((i) => optional[i]);
    const hours = hoursWithout(removed);
    if (hours <= budgetHours) {
      return { status: 'defer', defer: removed.sort(byMeanDesc), hoursAtConfidence: hours, pinnedHoursAtConfidence: pinnedHours };
    }
  }

  // Fallback for very large lists: remove the largest optional tasks until it fits.
  const removed: string[] = [];
  for (const id of [...optional].reverse()) {
    removed.push(id);
    const hours = hoursWithout(removed);
    if (hours <= budgetHours) return { status: 'defer', defer: removed.sort(byMeanDesc), hoursAtConfidence: hours, pinnedHoursAtConfidence: pinnedHours };
  }
  return { status: 'defer', defer: removed.sort(byMeanDesc), hoursAtConfidence: hoursFor(pinned), pinnedHoursAtConfidence: pinnedHours };
}
