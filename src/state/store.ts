import { useEffect, useReducer, useRef, useState } from 'react';
import { applyFamiliarity, clampHours, type Familiarity } from '../engine/estimate';
import { parseTaskList } from '../engine/parse';
import { loadProject, saveProject } from './persist';
import { sampleProject } from './sample';
import { emptyProject, newId, type Project, type Task } from './types';

export type Action =
  | { type: 'paste'; text: string }
  | { type: 'addTask'; name: string }
  | { type: 'updateTask'; id: string; patch: Partial<Pick<Task, 'name' | 'best' | 'likely' | 'worst'>> }
  | { type: 'setFamiliarity'; id: string; familiarity: Exclude<Familiarity, 'custom'> }
  | { type: 'removeTask'; id: string }
  | { type: 'togglePin'; id: string }
  | { type: 'movePhase'; ids: string[]; phase: 1 | 2 }
  | { type: 'setField'; field: 'name' | 'client' | 'assumptions' | 'preparedBy'; value: string }
  | { type: 'setNumber'; field: 'rate' | 'hoursPerDay'; value: number }
  | { type: 'setConfidence'; value: number }
  | { type: 'setBudget'; value: number | undefined }
  | { type: 'replace'; project: Project };

const roundHalfUp = (n: number) => Math.round(n * 2) / 2;
const cleanHours = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? undefined : clampHours(roundHalfUp(v)));

export interface PasteOutcome {
  added: number;
  skipped: number;
}

export function reducer(state: Project, action: Action): Project {
  const mapTask = (id: string, fn: (t: Task) => Task): Project => ({
    ...state,
    tasks: state.tasks.map((t) => (t.id === id ? fn(t) : t)),
  });

  switch (action.type) {
    case 'paste': {
      const { names } = parseTaskList(action.text, state.tasks.map((t) => t.name));
      const added: Task[] = names.map((name) => ({ id: newId(), name, familiarity: 'some', pinned: false, phase: 1 }));
      return { ...state, tasks: [...state.tasks, ...added] };
    }
    case 'addTask': {
      const name = action.name.trim();
      if (!name) return state;
      return { ...state, tasks: [...state.tasks, { id: newId(), name, familiarity: 'some', pinned: false, phase: 1 }] };
    }
    case 'updateTask':
      return mapTask(action.id, (t) => {
        const next: Task = { ...t };
        if (action.patch.name !== undefined) next.name = action.patch.name;
        if ('likely' in action.patch) {
          next.likely = cleanHours(action.patch.likely);
          // While a preset is active, best and worst follow the likely value.
          if (next.familiarity !== 'custom' && next.likely !== undefined) Object.assign(next, applyFamiliarity(next.likely, next.familiarity));
        }
        if ('best' in action.patch) {
          next.best = cleanHours(action.patch.best);
          next.familiarity = 'custom';
        }
        if ('worst' in action.patch) {
          next.worst = cleanHours(action.patch.worst);
          next.familiarity = 'custom';
        }
        return next;
      });
    case 'setFamiliarity':
      return mapTask(action.id, (t) => ({
        ...t,
        familiarity: action.familiarity,
        ...(t.likely !== undefined ? applyFamiliarity(t.likely, action.familiarity) : {}),
      }));
    case 'removeTask':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.id) };
    case 'togglePin':
      return mapTask(action.id, (t) => ({ ...t, pinned: !t.pinned }));
    case 'movePhase': {
      const ids = new Set(action.ids);
      return { ...state, tasks: state.tasks.map((t) => (ids.has(t.id) ? { ...t, phase: action.phase, pinned: action.phase === 2 ? false : t.pinned } : t)) };
    }
    case 'setField':
      return { ...state, [action.field]: action.value };
    case 'setNumber': {
      const v = Number.isFinite(action.value) ? action.value : 0;
      return action.field === 'rate'
        ? { ...state, rate: Math.min(10_000, Math.max(0, v)) }
        : { ...state, hoursPerDay: Math.min(24, Math.max(1, v || 1)) };
    }
    case 'setConfidence':
      return { ...state, confidence: Math.min(95, Math.max(50, Math.round(action.value / 5) * 5)) };
    case 'setBudget':
      return { ...state, budget: action.value === undefined || !Number.isFinite(action.value) || action.value <= 0 ? undefined : action.value };
    case 'replace':
      return action.project;
    default:
      return state;
  }
}

function initialProject(): { project: Project; storageAvailable: boolean } {
  const { project, storageAvailable } = loadProject();
  return { project: project ?? emptyProject(), storageAvailable };
}

/** The project state with autosave to this browser. */
export function useProject() {
  const [init] = useState(initialProject);
  const [project, dispatch] = useReducer(reducer, init.project);
  const [canSave, setCanSave] = useState(init.storageAvailable);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const handle = window.setTimeout(() => setCanSave(saveProject(project)), 250);
    return () => window.clearTimeout(handle);
  }, [project]);

  const loadSample = () => dispatch({ type: 'replace', project: sampleProject() });
  const reset = () => dispatch({ type: 'replace', project: emptyProject() });

  return { project, dispatch, canSave, loadSample, reset };
}
