---
doc: checklist
status: approved
---

# Build Checklist

Build mode: fast

## Slices

- [x] **1. Paste a list and get a forecast with a price**
  Becomes usable: A running app where pasted lines become tasks, likely hours can be typed, and the forecast panel shows the price and days at 80% confidence.
  Why now: Proves the kernel end to end on the first slice — parser, simulator, percentile, price — so every later slice lands on a working core.
  PRD ref: `prd.md > The Core Journey` (steps 1-4), `prd.md > Pasting the feature list`, `prd.md > The forecast`
  Spec ref: `spec.md > Engine: parser`, `spec.md > Engine: simulator`, `spec.md > Store`, `spec.md > File Structure`
  Build: Scaffold Vite + React + TypeScript with pinned versions, add MIT licence, engine parse/simulate with tests, a minimal store, task rows with three hour inputs, and a forecast panel with price and days.
  Verify (mechanical): `npm test` passes (parser cases, sampler bounds, determinism, percentile stability under 1%); `npm run build` succeeds; a scripted browser check pastes three lines, enters hours and reads a price.
  Learner check: Run `npm run dev`, paste three features, type likely hours, and confirm a price and number of working days appear.
  Commit: `Paste tasks and forecast a price at 80% confidence`

- [x] **2. Ranges that mean something: familiarity, confidence dial and curve**
  Becomes usable: Familiarity presets fill best/worst, out-of-order ranges are flagged, the confidence dial moves price and date, and the curve shows where the quote sits.
  Why now: This is what makes the quote explainable; the budget fitter in slice 3 reuses the same percentiles.
  PRD ref: `prd.md > Estimating a task`, `prd.md > Confidence dial`, `prd.md > The forecast`
  Spec ref: `spec.md > Engine: estimates`, `spec.md > ForecastCurve` via `spec.md > Workbench UI`, `spec.md > Look and Feel`
  Build: applyFamiliarity/normalizeRange with tests, familiarity chips, amber note, confidence dial, SVG cumulative curve with p10–p90 band and marker, plain-language sentence, median comparison; styling from the tokens.
  Verify (mechanical): `npm test` passes estimate tests; scripted browser check moves the dial from 50 to 90 and confirms the price increases monotonically.
  Learner check: Pick "New territory" on a task and watch the worst case grow; drag the dial and watch the price and the marker move.
  Commit: `Add familiarity presets, confidence dial and forecast curve`

- [x] **3. Fit a client budget with a phase 2**
  Becomes usable: Typing a budget shows its coverage and, when too low, which tasks to move to phase 2; applying it moves them and the phase-1 price fits.
  Why now: It is the "oh, that's cool" beat of the kernel and depends on slices 1–2.
  PRD ref: `prd.md > Fitting a client budget`
  Spec ref: `spec.md > Engine: budget fitter`, `spec.md > Store`
  Build: fitToBudget with tests (fits, defer, impossible, pinned never deferred, put-back pass), budget box UI, pins, phase grouping, move back.
  Verify (mechanical): `npm test` passes fit tests; scripted check enters a low budget, applies the suggestion and confirms the new phase-1 price is at or below the budget.
  Learner check: Load the sample, type a budget of EUR 8,000, apply the suggestion, and check the price now fits.
  Commit: `Suggest phase-2 deferrals to fit a client budget`

- [x] **4. Persistence, sample project, empty and error states**
  Becomes usable: Work survives a reload, "Sample" loads a realistic labelled project, "New" clears after confirmation, and every empty or broken state has a clear message.
  Why now: Needed before the quote and the demo; low risk once the core works.
  PRD ref: `prd.md > States and Boundaries`
  Spec ref: `spec.md > Store`, `spec.md > Important Failure Modes`
  Build: persist.ts with guarded storage, sample.ts, empty state, "needs hours" and "set a rate" states, storage-unavailable note.
  Verify (mechanical): `npm test` passes persistence tests (round trip, corrupt JSON, unavailable storage); scripted check reloads and finds the same tasks.
  Learner check: Load the sample, change a task, reload the page and confirm the change is still there.
  Commit: `Persist projects and add sample and empty states`

- [x] **5. Client quote page, print-ready**
  Becomes usable: A client-facing quote with scope, fixed price, delivery, phase 2 range, explanation, editable assumptions, printable to one A4 page.
  Why now: The deliverable the freelancer actually sends; it closes the core journey.
  PRD ref: `prd.md > Client quote`
  Spec ref: `spec.md > Client quote UI`
  Build: QuotePage, hash route, print.css, editable fields saved in the project.
  Verify (mechanical): `npm run build` succeeds; scripted check opens `#/quote`, confirms price matches the workbench, and prints to PDF with one page.
  Learner check: Open "Client quote", edit an assumption, and use Print / Save as PDF.
  Commit: `Add printable client quote`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 2 (dial and curve), screenshots reviewed against the style guide
- [ ] Final kick-the-tires exploration and feedback completed (agent-side: `scripts/e2e_check.py` 16/16 passing; owner hands-on review pending)

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [x] Learning activity complete — guided route, focused alternative, prior practice connected, or brief recap
- [ ] Optional edit and transfer reflection addressed — offered/declined/already covered/not applicable as appropriate (pending: offered to the owner in PUBLISH_CHECKLIST step 1)
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: brief evidence-based recap, not hands-on practice — the "defer as little as possible" criterion (`prd.md > Fitting a client budget`) became the test `defers close to the least expected work, checked against every subset` in `src/engine/engine.test.ts`, which caught an over-deferring fitter (see Revisions).
Route and stops: reference-only route in `devpost/app-map.html` (ForecastPanel `id="confidence"` → `useForecast` / `summarize` → `priceFor` + `ForecastCurve`); not toured live.
Edit outcome: not applicable yet — offered to the owner.
Reflection: not yet offered to the owner.
Activity mode: recap (the build ran while the owner was away; the owner reviews before shipping).

## Revisions

- Slices 1–5 were implemented in one continuous pass and committed together after all five slices' mechanical checks passed — the engine was written test-first, so the slice boundaries are kept as verification gates (unit tests per engine module and `scripts/e2e_check.py`, which walks each slice's behaviour in order) rather than as separate commits.
- Budget fitter changed from "greedy largest-first, then put back" to a best-first search over subsets ordered by expected hours removed — the greedy version deferred 36 h on the sample when about 30 h was enough, so the phase-1 price landed far under the budget instead of just within it. A test now compares the choice against every subset.
- Task names became auto-growing text areas — long feature names were cut off in the single-line field.
