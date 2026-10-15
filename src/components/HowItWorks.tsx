/* Three small diagrams that explain the method on the empty screen. Drawn in code, no images. */

const RangeDiagram = () => (
  <svg viewBox="0 0 160 64" aria-hidden="true">
    {[14, 32, 50].map((y, i) => {
      const [a, m, b] = [
        [20, 46, 80],
        [34, 58, 128],
        [26, 40, 62],
      ][i];
      return (
        <g key={y}>
          <line x1={a} x2={b} y1={y} y2={y} stroke="var(--graphite)" strokeWidth="2" strokeLinecap="round" />
          <line x1={a} x2={a} y1={y - 4} y2={y + 4} stroke="var(--graphite)" />
          <line x1={b} x2={b} y1={y - 4} y2={y + 4} stroke="var(--graphite)" />
          <circle cx={m} cy={y} r="3.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.6" />
        </g>
      );
    })}
  </svg>
);

const CurveDiagram = () => (
  <svg viewBox="0 0 160 64" aria-hidden="true">
    <rect x="52" y="4" width="64" height="54" fill="var(--paper-deep)" />
    <path d="M8 58 C 60 58, 70 6, 152 6" fill="none" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
    <line x1="8" x2="98" y1="16" y2="16" stroke="var(--terracotta)" strokeDasharray="2 3" />
    <line x1="98" x2="98" y1="16" y2="58" stroke="var(--terracotta)" strokeDasharray="2 3" />
    <circle cx="98" cy="16" r="4" fill="var(--terracotta)" stroke="var(--paper)" strokeWidth="1.5" />
  </svg>
);

const BudgetDiagram = () => (
  <svg viewBox="0 0 160 64" aria-hidden="true">
    <rect x="10" y="12" width="92" height="16" rx="2" fill="var(--ink)" />
    <rect x="106" y="12" width="40" height="16" rx="2" fill="none" stroke="var(--graphite)" strokeDasharray="3 2" />
    <rect x="10" y="38" width="92" height="16" rx="2" fill="var(--sage-wash)" stroke="var(--sage)" />
    <line x1="104" x2="104" y1="4" y2="60" stroke="var(--sage)" strokeWidth="1.5" strokeDasharray="4 3" />
  </svg>
);

const STEPS = [
  { title: 'Range every task', body: 'Best, likely and worst hours — or just say how familiar the work is.', Diagram: RangeDiagram },
  { title: 'Choose how sure', body: 'Scopecast runs the project 10,000 times. Pick the share of runs your price must cover.', Diagram: CurveDiagram },
  { title: 'Fit the budget honestly', body: 'Too expensive? It tells you what to move to a phase 2, instead of shaving hours.', Diagram: BudgetDiagram },
];

export function HowItWorks() {
  return (
    <ol className="how-it-works" aria-label="How Scopecast works">
      {STEPS.map(({ title, body, Diagram }, i) => (
        <li key={title}>
          <Diagram />
          <span className="step-num">{i + 1}</span>
          <strong>{title}</strong>
          <p>{body}</p>
        </li>
      ))}
    </ol>
  );
}
