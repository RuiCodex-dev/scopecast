import type { Familiarity } from '../engine/estimate';

export interface Task {
  id: string;
  name: string;
  best?: number;
  likely?: number;
  worst?: number;
  familiarity: Familiarity;
  pinned: boolean;
  phase: 1 | 2;
}

export interface Project {
  version: 1;
  name: string;
  client: string;
  /** EUR per hour. */
  rate: number;
  hoursPerDay: number;
  /** Percent, 50-95 in steps of 5. */
  confidence: number;
  /** EUR, optional. */
  budget?: number;
  tasks: Task[];
  assumptions: string;
  preparedBy: string;
  isSample: boolean;
}

export const DEFAULT_ASSUMPTIONS = [
  'Prices exclude VAT.',
  'Content (texts, photos, translations) is supplied by the client before development starts.',
  'Two rounds of design feedback are included.',
  'This quote is valid for 30 days.',
].join('\n');

export function emptyProject(): Project {
  return {
    version: 1,
    name: 'Untitled project',
    client: '',
    rate: 85,
    hoursPerDay: 6,
    confidence: 80,
    budget: undefined,
    tasks: [],
    assumptions: DEFAULT_ASSUMPTIONS,
    preparedBy: '',
    isSample: false,
  };
}

let counter = 0;
export function newId(): string {
  counter += 1;
  return `t${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}
