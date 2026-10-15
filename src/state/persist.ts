import { emptyProject, type Project, type Task } from './types';

export const STORAGE_KEY = 'scopecast.project.v1';

/** Minimal storage surface so the functions can be tested without a browser. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function browserStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

const num = (v: unknown, fallback: number, min: number, max: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const optNum = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback);

function cleanTask(t: unknown): Task | null {
  if (!t || typeof t !== 'object') return null;
  const o = t as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.name !== 'string') return null;
  const fam = o.familiarity;
  return {
    id: o.id,
    name: o.name,
    best: optNum(o.best),
    likely: optNum(o.likely),
    worst: optNum(o.worst),
    familiarity: fam === 'known' || fam === 'some' || fam === 'new' || fam === 'custom' ? fam : 'some',
    pinned: o.pinned === true,
    phase: o.phase === 2 ? 2 : 1,
  };
}

/** Validates an unknown value into a Project, or returns null if it is not one. */
export function coerceProject(value: unknown): Project | null {
  if (!value || typeof value !== 'object') return null;
  const o = value as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.tasks)) return null;
  const base = emptyProject();
  const conf = num(o.confidence, base.confidence, 50, 95);
  return {
    version: 1,
    name: str(o.name, base.name),
    client: str(o.client, ''),
    rate: num(o.rate, base.rate, 0, 10_000),
    hoursPerDay: num(o.hoursPerDay, base.hoursPerDay, 1, 24),
    confidence: Math.round(conf / 5) * 5,
    budget: optNum(o.budget),
    tasks: o.tasks.map(cleanTask).filter((t): t is Task => t !== null),
    assumptions: str(o.assumptions, base.assumptions),
    preparedBy: str(o.preparedBy, ''),
    isSample: o.isSample === true,
  };
}

export interface LoadResult {
  project: Project | null;
  /** False when storage could not be used at all (private mode, blocked site data). */
  storageAvailable: boolean;
}

export function loadProject(storage: StorageLike | null = browserStorage()): LoadResult {
  if (!storage) return { project: null, storageAvailable: false };
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { project: null, storageAvailable: true };
    return { project: coerceProject(JSON.parse(raw)), storageAvailable: true };
  } catch (e) {
    // A SyntaxError means corrupt data in working storage; anything else means storage is unusable.
    return { project: null, storageAvailable: e instanceof SyntaxError };
  }
}

/** Returns false when the write failed (quota, blocked storage). */
export function saveProject(project: Project, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(project));
    return true;
  } catch {
    return false;
  }
}
