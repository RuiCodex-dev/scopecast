import { useState } from 'react';
import { FAMILIARITY, type Familiarity, type NormalizedRange } from '../engine/estimate';
import type { Dispatch } from 'react';
import type { Action } from '../state/store';
import type { Project, Task } from '../state/types';
import { ArrowUpIcon, CloseIcon, PinIcon, PlusIcon } from './icons';
import { NumberField } from './NumberField';
import { formatHours, plural } from './format';
import { PasteBox } from './PasteBox';

interface Props {
  project: Project;
  ranges: Map<string, NormalizedRange>;
  dispatch: Dispatch<Action>;
}

const FAM_OPTIONS: Array<[Familiarity, string]> = [
  ['known', FAMILIARITY.known.label],
  ['some', FAMILIARITY.some.label],
  ['new', FAMILIARITY.new.label],
];

function RangeBar({ range, scale }: { range: NormalizedRange | undefined; scale: number }) {
  if (!range || scale <= 0) return <svg viewBox="0 0 100 18" role="presentation" />;
  const x = (h: number) => 4 + (h / scale) * 92;
  const { min, mode, max } = range.range;
  return (
    <svg viewBox="0 0 100 18" role="img" aria-label={`Range ${formatHours(min)} to ${formatHours(max)} hours, likely ${formatHours(mode)}`}>
      <line x1="4" y1="9" x2="96" y2="9" stroke="var(--rule-soft)" strokeWidth="1" />
      <line x1={x(min)} y1="9" x2={x(max)} y2="9" stroke="var(--graphite)" strokeWidth="2" strokeLinecap="round" />
      <line x1={x(min)} y1="5" x2={x(min)} y2="13" stroke="var(--graphite)" strokeWidth="1" />
      <line x1={x(max)} y1="5" x2={x(max)} y2="13" stroke="var(--graphite)" strokeWidth="1" />
      <circle cx={x(mode)} cy="9" r="3.2" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.6" />
    </svg>
  );
}

function TaskRow({ task, range, scale, dispatch }: { task: Task; range?: NormalizedRange; scale: number; dispatch: Dispatch<Action> }) {
  const later = task.phase === 2;
  const update = (patch: Partial<Pick<Task, 'best' | 'likely' | 'worst'>>) => dispatch({ type: 'updateTask', id: task.id, patch });
  return (
    <div className={`task-row${later ? ' is-later' : ''}`} data-task-id={task.id}>
      <div className="task-name-cell">
        <textarea
          className="task-name"
          aria-label="Task name"
          rows={1}
          value={task.name}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          onChange={(e) => dispatch({ type: 'updateTask', id: task.id, patch: { name: e.target.value.replace(/\s*\n\s*/g, ' ') } })}
        />
      </div>
      <div>
        <select
          className="fam-select"
          aria-label={`How familiar is "${task.name}"`}
          data-fam={task.familiarity}
          value={task.familiarity}
          title={task.familiarity === 'custom' ? 'Best and worst were set by hand' : FAMILIARITY[task.familiarity].hint}
          onChange={(e) => {
            const v = e.target.value as Familiarity;
            if (v !== 'custom') dispatch({ type: 'setFamiliarity', id: task.id, familiarity: v });
          }}
        >
          {FAM_OPTIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
          {task.familiarity === 'custom' && <option value="custom">Custom</option>}
        </select>
      </div>
      <NumberField className="hours" label={`Best case hours for "${task.name}"`} value={task.best} onChange={(v) => update({ best: v })} placeholder="–" />
      <NumberField className="hours likely" label={`Likely hours for "${task.name}"`} value={task.likely} onChange={(v) => update({ likely: v })} placeholder="?" />
      <NumberField className="hours" label={`Worst case hours for "${task.name}"`} value={task.worst} onChange={(v) => update({ worst: v })} placeholder="–" />
      <div className="range-cell">{range ? <RangeBar range={range} scale={scale} /> : <span className="needs-hours">needs hours</span>}</div>
      <div className="row-actions">
        {later ? (
          <button type="button" className="icon-btn" title="Back to phase 1" aria-label={`Move "${task.name}" back to phase 1`} onClick={() => dispatch({ type: 'movePhase', ids: [task.id], phase: 1 })}>
            <ArrowUpIcon />
          </button>
        ) : (
          <button
            type="button"
            className="icon-btn"
            aria-pressed={task.pinned}
            title={task.pinned ? 'Must-have: never suggested for phase 2' : 'Pin as must-have'}
            aria-label={`Must-have: ${task.name}`}
            onClick={() => dispatch({ type: 'togglePin', id: task.id })}
          >
            <PinIcon />
          </button>
        )}
        <button type="button" className="icon-btn" title="Remove task" aria-label={`Remove "${task.name}"`} onClick={() => dispatch({ type: 'removeTask', id: task.id })}>
          <CloseIcon />
        </button>
      </div>
      {range?.reordered && (
        <p className="row-note">
          Out of order — read as best {formatHours(range.range.min)} · likely {formatHours(range.range.mode)} · worst {formatHours(range.range.max)} h.
        </p>
      )}
    </div>
  );
}

export function TaskList({ project, ranges, dispatch }: Props) {
  const [newName, setNewName] = useState('');
  const [pasting, setPasting] = useState(false);
  const phase1 = project.tasks.filter((t) => t.phase === 1);
  const phase2 = project.tasks.filter((t) => t.phase === 2);
  let scale = 0;
  for (const r of ranges.values()) scale = Math.max(scale, r.range.max);
  const needs = phase1.filter((t) => !ranges.has(t.id)).length;

  return (
    <section className="tasks" aria-labelledby="tasks-title">
      <div className="panel-title">
        <h2 id="tasks-title">Tasks</h2>
        <span className="panel-meta">
          {plural(project.tasks.length, 'task')}
          {needs > 0 && ` · ${needs} need${needs === 1 ? 's' : ''} hours`}
        </span>
      </div>

      <div className="settings">
        <label className="field">
          Rate
          <NumberField label="Hourly rate in euros" value={project.rate} onChange={(v) => dispatch({ type: 'setNumber', field: 'rate', value: v ?? 0 })} />
          € / hour
        </label>
        <label className="field">
          Working day
          <NumberField label="Billable hours per working day" value={project.hoursPerDay} onChange={(v) => dispatch({ type: 'setNumber', field: 'hoursPerDay', value: v ?? 1 })} />
          hours
        </label>
      </div>

      <div className="task-table" role="group" aria-label="Task estimates">
        <div className="task-head" aria-hidden="true">
          <span>Task</span>
          <span>Familiarity</span>
          <span className="num">Best</span>
          <span className="num">Likely</span>
          <span className="num">Worst</span>
          <span>Range</span>
          <span />
        </div>

        <div className="group-label">
          <span>Phase 1</span>
          <small>quoted now</small>
        </div>
        {phase1.map((t) => (
          <TaskRow key={t.id} task={t} range={ranges.get(t.id)} scale={scale} dispatch={dispatch} />
        ))}

        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({ type: 'addTask', name: newName });
            setNewName('');
          }}
        >
          <input aria-label="New task name" placeholder="Add a task and press Enter" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <button type="submit" className="btn" disabled={!newName.trim()}>
            <PlusIcon /> Add
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setPasting((p) => !p)} aria-expanded={pasting}>
            {pasting ? 'Close paste' : 'Paste more'}
          </button>
        </form>
        {pasting && (
          <div style={{ marginTop: 'var(--s3)' }}>
            <PasteBox
              compact
              onPaste={(text) => {
                dispatch({ type: 'paste', text });
                setPasting(false);
              }}
            />
          </div>
        )}

        {phase2.length > 0 && (
          <>
            <div className="group-label">
              <span>Phase 2</span>
              <small>later, quoted separately</small>
            </div>
            {phase2.map((t) => (
              <TaskRow key={t.id} task={t} range={ranges.get(t.id)} scale={scale} dispatch={dispatch} />
            ))}
          </>
        )}
      </div>
    </section>
  );
}
