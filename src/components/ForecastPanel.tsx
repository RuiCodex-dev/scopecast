import type { CSSProperties, Dispatch } from 'react';
import type { Action } from '../state/store';
import type { Project } from '../state/types';
import { daysFor, hoursWithin, priceFor, RUNS, type Forecast } from '../state/useForecast';
import { ForecastCurve } from './ForecastCurve';
import { formatEur, formatHours, formatInt, parseMoney, plural } from './format';
import { NumberField } from './NumberField';

interface Props {
  project: Project;
  forecast: Forecast;
  dispatch: Dispatch<Action>;
}

const TICKS = [50, 60, 70, 80, 90, 95];

export function ForecastPanel({ project, forecast, dispatch }: Props) {
  const { phase1, phase2, p, hours, median } = forecast;
  const pct = project.confidence;
  const hasRate = project.rate > 0;

  if (!phase1) {
    return (
      <aside className="forecast" aria-label="Forecast">
        <div className="empty-forecast">
          <span className="eyebrow">Quote at {pct}% confidence</span>
          <span className="price" aria-hidden="true">
            €—
          </span>
          <p>
            {project.tasks.length === 0
              ? 'Add tasks on the left. As soon as one has hours, the forecast appears here.'
              : 'Add likely hours to a task to see the forecast.'}
          </p>
        </div>
      </aside>
    );
  }

  const price = priceFor(hours, project.rate);
  const days = daysFor(hours, project.hoursPerDay);
  const runsWithin = Math.round(p * RUNS);
  const budget = forecast.budget;
  const taskName = (id: string) => project.tasks.find((t) => t.id === id)?.name ?? 'Task';
  const likelyOf = (id: string) => forecast.ranges.get(id)?.range.mode ?? 0;
  const fillStyle = { '--fill': `${((pct - 50) / 45) * 100}%` } as CSSProperties;

  return (
    <aside className="forecast" aria-label="Forecast">
      <div className="price-block" aria-live="polite">
        <span className="eyebrow">Fixed price at {pct}% confidence</span>
        <strong className="price value-change" key={`${price}-${hasRate}`} data-testid="price">
          {hasRate ? formatEur(price) : 'Set a rate'}
        </strong>
        <span className="price-sub">
          <strong data-testid="hours">{formatHours(hours)} hours</strong> · <strong data-testid="days">{plural(days, 'working day')}</strong> at {formatHours(project.hoursPerDay)} h a day
        </span>
      </div>

      <div className="explain">
        <p>
          In {formatInt(runsWithin)} of {formatInt(RUNS)} simulated runs this project took {formatHours(hours)} hours or less.
        </p>
        <p>
          Most likely outcome: {formatHours(median)} hours{hasRate ? ` (${formatEur(priceFor(median, project.rate))})` : ''}. The gap is what you are insuring against.
        </p>
        {forecast.needsHours > 0 && <p>{plural(forecast.needsHours, 'task')} still need hours and are not included yet.</p>}
      </div>

      <div className="dial">
        <div className="dial-head">
          <label htmlFor="confidence" className="eyebrow">
            Confidence
          </label>
          <span className="dial-value">{pct}%</span>
        </div>
        <input
          id="confidence"
          type="range"
          min={50}
          max={95}
          step={5}
          value={pct}
          style={fillStyle}
          aria-valuetext={`${pct} percent`}
          onChange={(e) => dispatch({ type: 'setConfidence', value: Number(e.target.value) })}
        />
        <div className="dial-ticks" aria-hidden="true">
          {TICKS.map((t) => (
            <span key={t}>{t}%</span>
          ))}
        </div>
      </div>

      <figure className="curve" style={{ margin: 0 }}>
        <ForecastCurve
          summary={phase1}
          p={p}
          budgetHours={project.budget !== undefined && hasRate ? hoursWithin(project.budget, project.rate) : undefined}
          budgetFits={budget ? budget.coverage >= p : undefined}
        />
        <figcaption className="curve-caption">Chance of finishing within a number of hours, from {formatInt(RUNS)} simulated runs of this project.</figcaption>
      </figure>

      <div className="budget">
        <div className="budget-row">
          <label htmlFor="budget" className="eyebrow">
            Client budget
          </label>
          <span className="money-input">
            <span>€</span>
            <NumberFieldMoney value={project.budget} onChange={(v) => dispatch({ type: 'setBudget', value: v })} />
          </span>
        </div>

        {budget && project.budget !== undefined && (
          <div className={`verdict ${budget.fit.status === 'fits' ? 'fits' : budget.fit.status === 'impossible' ? 'impossible' : 'defer'}`} data-testid="verdict">
            <p>
              {formatEur(project.budget)} covers <strong>{Math.round(budget.coverage * 100)}%</strong> of simulated outcomes.
            </p>
            {budget.fit.status === 'fits' && <p>That is at or above your {pct}% confidence. The quote fits.</p>}
            {budget.fit.status === 'impossible' && (
              <p>
                Your must-have tasks alone need {formatEur(priceFor(budget.fit.pinnedHoursAtConfidence, project.rate))} at {pct}%. Raise the budget, lower the
                confidence, or unpin a task.
              </p>
            )}
            {budget.fit.status === 'defer' && (
              <>
                <p>
                  To quote within budget at {pct}%, move {plural(budget.fit.defer.length, 'task')} to phase 2:
                </p>
                <ul className="defer-list">
                  {budget.fit.defer.map((id) => (
                    <li key={id}>
                      <span>{taskName(id)}</span>
                      <span>~{formatHours(likelyOf(id))} h</span>
                    </li>
                  ))}
                </ul>
                <p style={{ marginBottom: 'var(--s3)' }}>
                  Phase 1 becomes <strong>{formatEur(priceFor(budget.fit.hoursAtConfidence, project.rate))}</strong> at {pct}% confidence.
                </p>
                <button type="button" className="btn btn-accent" onClick={() => dispatch({ type: 'movePhase', ids: budget.fit.defer, phase: 2 })}>
                  Move {budget.fit.defer.length === 1 ? 'it' : `these ${budget.fit.defer.length}`} to phase 2
                </button>
              </>
            )}
          </div>
        )}
        {!hasRate && project.budget !== undefined && <p className="phase2-summary">Set an hourly rate to compare against a budget.</p>}
      </div>

      {phase2 && hasRate && (
        <p className="phase2-summary" data-testid="phase2">
          Phase 2 estimate: {formatEur(priceFor(phase2.at(0.1), project.rate))} – {formatEur(priceFor(phase2.at(0.9), project.rate))} (likely range), quoted separately.
        </p>
      )}
    </aside>
  );
}

function NumberFieldMoney({ value, onChange }: { value: number | undefined; onChange: (v: number | undefined) => void }) {
  return (
    <span style={{ display: 'contents' }}>
      <NumberField id="budget" label="Client budget in euros" value={value} onChange={onChange} parse={parseMoney} format={(n) => formatInt(n)} placeholder="optional" />
    </span>
  );
}
