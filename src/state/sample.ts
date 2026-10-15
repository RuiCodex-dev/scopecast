import { applyFamiliarity, type Familiarity } from '../engine/estimate';
import { DEFAULT_ASSUMPTIONS, type Project, type Task } from './types';

/** Sample data for the demo. The bakery is fictional; the UI labels this project as a sample. */
const SAMPLE_TASKS: Array<[name: string, likely: number, familiarity: Exclude<Familiarity, 'custom'>, pinned: boolean]> = [
  ['Visual design and page layouts', 14, 'known', true],
  ['Product catalogue with categories and photos', 12, 'known', true],
  ['Order basket with pickup time slots', 18, 'some', true],
  ['Online payment with Bancontact and cards', 14, 'new', true],
  ['Order dashboard for the shop', 20, 'some', false],
  ['Order confirmations by email and SMS', 8, 'some', false],
  ['Opening hours and holiday closures', 5, 'known', false],
  ['Pages in Dutch, French and English', 10, 'some', false],
  ['Digital loyalty stamp card', 16, 'new', false],
  ['Hosting, backups and launch', 6, 'known', false],
];

export function sampleProject(): Project {
  // Fixed ids keep the sample's simulated numbers identical every time it is loaded.
  const tasks: Task[] = SAMPLE_TASKS.map(([name, likely, familiarity, pinned], i) => ({
    id: `sample-${i + 1}`,
    name,
    likely,
    ...applyFamiliarity(likely, familiarity),
    familiarity,
    pinned,
    phase: 1,
  }));
  return {
    version: 1,
    name: 'Online ordering',
    client: 'De Korenbloem bakery',
    rate: 85,
    hoursPerDay: 6,
    confidence: 80,
    budget: undefined,
    tasks,
    assumptions: DEFAULT_ASSUMPTIONS,
    preparedBy: '',
    isSample: true,
  };
}
