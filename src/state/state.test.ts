import { describe, expect, it } from 'vitest';
import { coerceProject, loadProject, saveProject, STORAGE_KEY, type StorageLike } from './persist';
import { sampleProject } from './sample';
import { reducer } from './store';
import { emptyProject } from './types';
import { daysFor, hoursWithin, priceFor } from './useForecast';

const memory = (): StorageLike & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};

describe('persistence', () => {
  it('round-trips a project', () => {
    const s = memory();
    const p = sampleProject();
    expect(saveProject(p, s)).toBe(true);
    expect(loadProject(s)).toEqual({ project: p, storageAvailable: true });
  });

  it('treats corrupt JSON as no project, with storage still usable', () => {
    const s = memory();
    s.data.set(STORAGE_KEY, '{not json');
    expect(loadProject(s)).toEqual({ project: null, storageAvailable: true });
  });

  it('reports unusable storage', () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(loadProject(throwing).storageAvailable).toBe(false);
    expect(saveProject(emptyProject(), throwing)).toBe(false);
    expect(loadProject(null).storageAvailable).toBe(false);
  });

  it('rejects foreign shapes and cleans bad fields', () => {
    expect(coerceProject({ version: 2, tasks: [] })).toBeNull();
    const p = coerceProject({ version: 1, tasks: [{ id: 'a', name: 'A', likely: 'x', phase: 7 }, { nope: true }], confidence: 83, rate: -5 })!;
    expect(p.tasks).toHaveLength(1);
    expect(p.tasks[0]).toMatchObject({ likely: undefined, phase: 1, familiarity: 'some' });
    expect(p.confidence).toBe(85);
    expect(p.rate).toBe(0);
  });
});

describe('reducer', () => {
  it('pastes tasks and keeps presets in step with likely hours', () => {
    let p = reducer(emptyProject(), { type: 'paste', text: '- Login\n- Signup' });
    expect(p.tasks.map((t) => t.name)).toEqual(['Login', 'Signup']);
    const id = p.tasks[0].id;
    p = reducer(p, { type: 'setFamiliarity', id, familiarity: 'new' });
    p = reducer(p, { type: 'updateTask', id, patch: { likely: 10 } });
    expect(p.tasks[0]).toMatchObject({ best: 6, likely: 10, worst: 25, familiarity: 'new' });
    p = reducer(p, { type: 'updateTask', id, patch: { worst: 40 } });
    expect(p.tasks[0]).toMatchObject({ worst: 40, familiarity: 'custom' });
    p = reducer(p, { type: 'updateTask', id, patch: { likely: 12 } });
    expect(p.tasks[0]).toMatchObject({ best: 6, likely: 12, worst: 40 });
  });

  it('moving to phase 2 unpins, and confidence snaps to steps of 5', () => {
    let p = sampleProject();
    const pinned = p.tasks.find((t) => t.pinned)!;
    p = reducer(p, { type: 'movePhase', ids: [pinned.id], phase: 2 });
    expect(p.tasks.find((t) => t.id === pinned.id)).toMatchObject({ phase: 2, pinned: false });
    expect(reducer(p, { type: 'setConfidence', value: 99 }).confidence).toBe(95);
    expect(reducer(p, { type: 'setConfidence', value: 72 }).confidence).toBe(70);
    expect(reducer(p, { type: 'setBudget', value: 0 }).budget).toBeUndefined();
  });
});

describe('pricing', () => {
  it('rounds prices up to EUR 50 and days up', () => {
    expect(priceFor(100, 85)).toBe(8500);
    expect(priceFor(100.1, 85)).toBe(8550);
    expect(daysFor(36, 6)).toBe(6);
    expect(daysFor(36.5, 6)).toBe(7);
    expect(daysFor(0, 6)).toBe(0);
  });

  it('converts a budget to the hours whose rounded price still fits', () => {
    const h = hoursWithin(9620, 85);
    expect(priceFor(h, 85)).toBeLessThanOrEqual(9620);
    expect(priceFor(h + 0.01, 85)).toBeGreaterThan(9620);
  });
});
