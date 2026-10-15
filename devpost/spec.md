---
doc: spec
status: approved
---

# Scopecast — Technical Spec

## How This Works, In Plain Language
Scopecast is a single web page that runs entirely in the browser; there is no server and no account.

- The **task list** holds what the freelancer typed: names, three hour numbers per task, a familiarity
  label, a must-have pin and which phase the task is in.
- The **simulator** pretends to run the project 10,000 times. In each run it picks an hour count for every
  task somewhere between its best and worst number, most often near the likely number (a PERT curve: a
  smooth hump that leans toward the worst case when the worst case is far away). It adds the tasks up, so
  we get 10,000 possible project totals.
- Sorting those totals answers every question: the total that 80% of runs stayed under is the
  "80% confidence" hours. Price and working days come from that number.
- The **budget fitter** asks the same 10,000 runs a different question: which tasks can be left out so that
  the chosen share of runs fits under the client's budget.
- The simulator uses a fixed random seed per task, so the same inputs always produce the same quote. That
  also makes the budget fitter fair: removing a task removes exactly its contribution from every run.
- The project is saved in the browser's local storage after every change.

Why this shape: the whole kernel is arithmetic on numbers the freelancer already has. A server, a database
or an AI service would add cost and failure points without making the quote more honest.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. Paste → `parseTaskList()` turns text into names → the store adds task rows → autosave.
2. Familiarity or hours edited → the store updates the task → `applyFamiliarity()` fills best/worst.
3. Any change → `useForecast()` asks the simulator for each estimated task's 10,000 samples (cached by
   task id + numbers) → sums phase-1 tasks per run → `summarize()` returns sorted totals and percentiles.
4. Confidence dial → only the percentile lookup changes; no re-simulation.
5. Budget typed → `coverage()` gives the share of runs under the budget in hours; `fitToBudget()` returns
   the tasks to defer → the forecast panel renders the suggestion → "Move" updates task phases.
6. Client quote route reads the same store and forecast and renders a print layout.

## Stack
- **TypeScript 6.0.3** — type safety for the engine; https://www.typescriptlang.org/docs/
- **React 19.3.0 + react-dom** — small component UI the owner already knows; https://react.dev/
- **Vite 8.3.1** with **@vitejs/plugin-react 6.1.1** — dev server and static build; https://vite.dev/guide/
- **Vitest 5.0.3** — unit tests for the engine and parser; https://vitest.dev/
- **@fontsource/fraunces 5.3.0** and **@fontsource/ibm-plex-sans 5.3.0** — self-hosted OFL fonts;
  https://fontsource.org/
- No chart library: two small SVG components keep the chart quiet and on-brand.
Versions are pinned exactly in `package.json`. Rationale: the owner works in TypeScript/React regularly,
and a static Vite build can be opened, recorded or hosted anywhere later.

## Where It Runs and How Someone Tries It
- Requirements: Node.js 22 or newer, npm. No API keys, no environment variables.
- Install: `npm install`
- Run: `npm run dev`, then open the printed URL (http://localhost:5173). Click "Try the sample project".
- Tests: `npm test`
- Static build: `npm run build` → `dist/` (any static host; deployment is optional and not planned).
- Demo recording: run `npm run dev` and record the browser at 1920x1080 (scripted capture in
  `video/capture/`).

## Look and Feel
Carried from `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`; tokens live in
`src/styles/tokens.css` and are documented in `design/STYLE_GUIDE.md`.
- Palette: paper `#F3EEE4`, paper-deep `#E9E2D3`, ink `#1F1C17`, graphite `#5C574E`, rule `#CFC6B4`,
  terracotta `#B8502E` (accent), sage `#5E7B62` (fits), ochre `#B88A2B` (warnings).
- Type: Fraunces (display, the big price, headings), IBM Plex Sans (UI, tabular numerals).
- Spacious, calm density; 8px spacing scale; hairline rules instead of shadows; one accent per view.
- Copy: second person, short, no jargon without a plain explanation.
- Motion: 150–200 ms ease-out on value changes; respects `prefers-reduced-motion`.

## Components

### Engine: parser
`src/engine/parse.ts` — `parseTaskList(text)` returns `{ names, skipped }`.
PRD ref: `prd.md > Pasting the feature list`.

### Engine: estimates
`src/engine/estimate.ts` — familiarity presets, `applyFamiliarity()`, `normalizeRange()` (sorts, flags
out-of-order), rounding to half hours.
PRD ref: `prd.md > Estimating a task`.

### Engine: simulator
`src/engine/simulate.ts` — seeded PRNG (mulberry32), gamma/beta sampling (Marsaglia–Tsang) for the PERT
distribution (lambda 4), `sampleTask(task, runs, seed)` returning a `Float64Array`, `sumRuns()`,
`summarize()` (sorted totals, percentile lookup, median, p10/p90), `coverage()`.
PRD ref: `prd.md > The forecast`, `prd.md > Confidence dial`.

### Engine: budget fitter
`src/engine/fit.ts` — `fitToBudget(samplesById, phase1Ids, pinnedIds, budgetHours, confidence)`:
greedy removal of the non-pinned task with the largest mean until the percentile fits, then a pass that
puts back removed tasks (smallest first) when they still fit. Returns `{ status: 'fits' | 'defer' |
'impossible', defer: ids, hoursAtConfidence }`.
PRD ref: `prd.md > Fitting a client budget`.

### Store
`src/state/store.ts` — `useReducer` with actions (paste, add, update, remove, pin, move phase, settings,
budget, confidence, quote fields, new, load sample); `src/state/persist.ts` saves to `localStorage`
under `scopecast.project.v1` with a version check; `src/state/sample.ts` holds the sample project
(labelled as sample data in the UI).
PRD ref: `prd.md > States and Boundaries`.

### Forecast hook
`src/state/useForecast.ts` — memoises per-task samples and the phase-1/phase-2 summaries.

### Workbench UI
`src/components/` — `Header`, `Settings`, `TaskList`, `TaskRow`, `PasteBox`, `ForecastPanel`,
`ConfidenceDial`, `ForecastCurve` (SVG), `BudgetBox`, `EmptyState`.
PRD ref: `prd.md > Screens and Layout`.

### Client quote UI
`src/components/QuotePage.tsx` + `src/styles/print.css`.
PRD ref: `prd.md > Client quote`.

## Data Model
```ts
type Familiarity = 'known' | 'some' | 'new' | 'custom';
interface Task { id: string; name: string; best?: number; likely?: number; worst?: number;
                 familiarity: Familiarity; pinned: boolean; phase: 1 | 2; }
interface Project { version: 1; name: string; client: string; rate: number; hoursPerDay: number;
                    confidence: number; budget?: number; tasks: Task[];
                    assumptions: string; preparedBy: string; isSample: boolean; }
```
All of it lives in `localStorage` and is restored on load; samples are derived, never stored.

## File Structure
```
scopecast/
├── index.html
├── package.json              # pinned versions, scripts: dev, build, test, preview
├── tsconfig.json
├── vite.config.ts
├── LICENSE                   # MIT (required: public repo with an open-source licence)
├── README.md                 # what it is, how to run, how it works
├── src/
│   ├── main.tsx              # entry, hash routing between workbench and quote
│   ├── App.tsx
│   ├── engine/               # pure TypeScript: parse, estimate, simulate, fit (+ *.test.ts)
│   ├── state/                # store, persistence, sample project, useForecast
│   ├── components/           # workbench and quote UI
│   └── styles/               # tokens.css, app.css, print.css
├── public/                   # favicon, social image
├── design/                   # STYLE_GUIDE.md, GENERATED_ASSETS.md, imagery
├── video/                    # capture scripts and HyperFrames composition for the demo video
├── devpost/                  # Devpost Learn planning docs (scope, prd, spec, checklist, app map)
└── .agents/ .claude/ agent/  # Devpost Learn Skill Pack as installed by `npx skills add`
```

## External Services and Dependencies
None at runtime. Fonts are bundled from npm (`@fontsource/*`, SIL Open Font License 1.1).

## Important Failure Modes
- **localStorage unavailable or corrupt** (private mode, blocked storage, bad JSON) → the app starts with an
  empty project and shows a quiet note "Changes won't be saved in this browser"; every access is guarded.
- **Huge or silly inputs** (worst = 100000 h) → inputs are clamped to 0–2000 h per task; the chart scales.
- **Slow devices** → 10,000 runs x 40 tasks is 400k samples; samples are cached per task so a dial move or
  one edit recomputes only what changed.

## What Was Simplified and Why
- **Line-per-task paste** instead of AI brief parsing — no key, no cost, and the freelancer keeps control.
- **Browser print to PDF** instead of a PDF library — the browser already does it well.
- **Greedy budget fit** instead of an exact optimiser — with at most 40 tasks it finds a sensible small
  deferral instantly; an exact search would be slower and harder to explain.
- **Independent tasks** — the simulation assumes task overruns are independent; correlated risk is noted
  as a limitation in the README.

## Decisions and Open Issues
- Owner decision: React + TypeScript + Vite, browser-only, no deployment for the POC.
- Owner decision: PERT (beta) distribution rather than triangular — it is smoother and closer to how
  freelancers think about "likely".
- Implementation detail: seeded sampling per task so results are reproducible and the fitter is consistent.
- **One useful unknown**: how many simulated runs are enough before the quoted percentile stops moving?
  Agreed check: a test compares the 80th percentile at 10,000 runs across different seeds; the spread must
  stay under 1% of the value. If it does not, raise the run count.
- Open: none.
