import type { Dispatch } from 'react';
import type { Action } from '../state/store';
import type { Project } from '../state/types';
import { daysFor, priceFor, RUNS, type Forecast } from '../state/useForecast';
import { formatEur, formatInt, plural } from './format';
import { ArrowLeftIcon, Mark, PrintIcon } from './icons';

interface Props {
  project: Project;
  forecast: Forecast;
  dispatch: Dispatch<Action>;
}

const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export function QuotePage({ project, forecast, dispatch }: Props) {
  const { phase1, phase2, p, hours } = forecast;
  const pct = project.confidence;
  const phase1Tasks = project.tasks.filter((t) => t.phase === 1 && forecast.ranges.has(t.id));
  const phase2Tasks = project.tasks.filter((t) => t.phase === 2 && forecast.ranges.has(t.id));
  const price = priceFor(hours, project.rate);
  const days = daysFor(hours, project.hoursPerDay);
  const ready = phase1 && project.rate > 0;

  return (
    <div className="quote-screen">
      <div className="quote-toolbar no-print">
        <a className="btn btn-quiet" href="#/">
          <ArrowLeftIcon /> Back to estimate
        </a>
        <span className="panel-meta">This page is what your client sees. Click any underlined text to edit it.</span>
        <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={!ready}>
          <PrintIcon /> Print / Save as PDF
        </button>
      </div>

      <article className="sheet" aria-label="Client quote">
        <header className="sheet-head">
          <div>
            <span className="eyebrow">Quote</span>
            <h1>{project.name || 'Untitled project'}</h1>
            <p className="sheet-client">Prepared for {project.client || 'your client'}</p>
          </div>
          <div className="sheet-meta">
            <span>{today()}</span>
            <label className="prepared">
              <span>Prepared by</span>
              <input
                aria-label="Prepared by"
                placeholder="Your name or company"
                value={project.preparedBy}
                onChange={(e) => dispatch({ type: 'setField', field: 'preparedBy', value: e.target.value })}
              />
            </label>
          </div>
        </header>

        {!ready ? (
          <p className="sheet-empty">Add tasks with hours and an hourly rate to produce a quote.</p>
        ) : (
          <>
            <section className="sheet-figures">
              <div>
                <span className="eyebrow">Fixed price</span>
                <strong className="sheet-price" data-testid="quote-price">
                  {formatEur(price)}
                </strong>
                <span className="sheet-note">excl. VAT</span>
              </div>
              <div>
                <span className="eyebrow">Delivery</span>
                <strong className="sheet-days">{plural(days, 'working day')}</strong>
                <span className="sheet-note">from kickoff</span>
              </div>
            </section>

            <section className="sheet-section">
              <h2>Scope</h2>
              <ol className="scope-list">
                {phase1Tasks.map((t) => (
                  <li key={t.id}>{t.name}</li>
                ))}
              </ol>
            </section>

            {phase2 && phase2Tasks.length > 0 && (
              <section className="sheet-section">
                <h2>Phase 2 — optional, quoted separately</h2>
                <ul className="scope-list later">
                  {phase2Tasks.map((t) => (
                    <li key={t.id}>{t.name}</li>
                  ))}
                </ul>
                <p className="sheet-note">
                  Estimated {formatEur(priceFor(phase2.at(0.1), project.rate))} – {formatEur(priceFor(phase2.at(0.9), project.rate))}, confirmed before phase 2 starts.
                </p>
              </section>
            )}

            <section className="sheet-section how">
              <h2>How this price was estimated</h2>
              <p>
                Every task was estimated as a range — best case, likely, worst case — instead of a single guess. We then simulated the project {formatInt(RUNS)} times. The
                fixed price above covers {pct}% of those outcomes ({formatInt(Math.round(p * RUNS))} of {formatInt(RUNS)} runs), so the risk of an overrun sits with us, not with
                you.
              </p>
            </section>

            <section className="sheet-section">
              <h2>Assumptions</h2>
              <textarea
                className="assumptions"
                aria-label="Assumptions"
                value={project.assumptions}
                rows={Math.max(3, project.assumptions.split('\n').length)}
                onChange={(e) => dispatch({ type: 'setField', field: 'assumptions', value: e.target.value })}
              />
            </section>
          </>
        )}

        <footer className="sheet-foot">
          <Mark />
          <span>Estimated with Scopecast</span>
        </footer>
      </article>
    </div>
  );
}
