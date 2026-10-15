---
doc: prd
status: approved
---

# Scopecast — Product Requirements

A browser tool that lets a solo freelance developer turn a client's feature list into a fixed-price quote
with a stated confidence level, and shows what to defer when the client's budget is too low.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
1. The freelancer opens Scopecast. With no project yet, they see a short explanation, a large paste box
   ("Paste the client's feature list, one item per line") and a "Try the sample project" link.
2. They paste eight lines. Each becomes a task row; bullets and numbering are stripped. Rows without hours
   are marked "needs hours" and are not yet in the forecast.
3. For each task they choose how familiar the work is (Known / Some unknowns / New territory) and type the
   likely hours. Best and worst hours fill in from the familiarity; they can overwrite any of the three.
4. As soon as one task has hours, the forecast panel shows the price and working days at the current
   confidence (default 80%), a curve of "chance of finishing within N hours", and one plain sentence
   explaining what the confidence means.
5. They drag the confidence dial between 50% and 95%; price, days, the marker on the curve and the sentence
   update immediately.
6. They enter the client's budget. Scopecast says what share of simulated outcomes that budget covers. If it
   is below the chosen confidence, it lists the tasks to move to phase 2 (never pinned "must-have" tasks)
   and the phase-1 price that results. "Move these to phase 2" applies it.
7. They open the client quote. It shows phase-1 scope, the fixed price, delivery in working days, phase 2 as
   an optional estimated range, a short "how this was estimated" note and editable assumptions. They print
   it or save it as PDF from the browser.
Success: a quote whose price and date are backed by an explicit confidence level, with a phase 2 instead
of silent unpaid hours. (`scope.md > What "Working" Looks Like`)

## Screens and Layout
- **Workbench** (main screen). Header: wordmark, editable project and client names, "New", "Sample",
  "Client quote" buttons. Below, two columns on desktop (stacked on narrow screens):
  - Left, **Tasks**: rate and hours-per-day settings, the task list grouped as "Phase 1" and "Phase 2",
    an "Add task" control and a "Paste more" control.
  - Right, **Forecast**: price and days at the confidence, the confidence dial, the curve, the plain-language
    sentence, and the client budget box with its result.
- **Client quote** (`#/quote`). A single A4-proportioned page in the same visual language, plus a small
  toolbar (Back, Print / Save as PDF) that does not print.

## Look and Feel
- Warm paper background, near-black ink, one terracotta accent for the confidence marker and primary
  actions; sage for "fits", ochre for warnings. No gradients, no glass, no drop-shadow cards.
- Serif display face for headings and the big price; a clean sans with tabular numerals for everything else.
- Quiet, Tufte-like chart: thin ink line, light grid, no chart junk.
- Copy is plain and direct, written for a freelancer, no statistics jargon without a one-line explanation.
(`scope.md > Inspiration & Identity`)

## Features and Behavior

### Pasting the feature list
- As a freelancer, I want to paste a client's list and get task rows so I don't retype it.
  - [ ] Each non-empty line becomes one task, in order.
  - [ ] Leading bullets (`-`, `*`, `•`) and numbering (`1.`, `1)`, `a)`) are removed.
  - [ ] Exact duplicates (case-insensitive) are added once.
  - [ ] At most 40 tasks per paste; the rest are reported as skipped.

### Estimating a task
- As a freelancer, I want to give a range, not a single number.
  - [ ] Each row has name, familiarity, best / likely / worst hours, a "must-have" pin and delete.
  - [ ] Choosing familiarity with likely hours set fills best and worst: Known 0.8x / 1.3x, Some unknowns
        0.7x / 1.8x, New territory 0.6x / 2.5x, rounded to the nearest half hour.
  - [ ] Editing best or worst by hand switches the familiarity label to "Custom".
  - [ ] If the three numbers are out of order, the row shows an amber note and the forecast uses them sorted.
  - [ ] A row with no likely hours shows "needs hours" and is excluded from the forecast.

### The forecast
- As a freelancer, I want a price and date I can stand behind.
  - [ ] The project is simulated 10,000 times; results are stable (the same inputs always give the same
        numbers).
  - [ ] Price = hours at the chosen percentile x hourly rate, rounded up to the next EUR 50.
  - [ ] Working days = hours at the percentile / hours per day, rounded up.
  - [ ] The curve shows cumulative probability against hours, with a marker at the chosen confidence and a
        light band from the 10th to the 90th percentile.
  - [ ] The sentence reads like: "In 8,000 of 10,000 simulated runs this project took 124 hours or less."
  - [ ] The panel also shows the most likely outcome (median) for comparison.

### Confidence dial
  - [ ] Range 50% to 95% in steps of 5; default 80%; keyboard accessible.
  - [ ] Changing it updates price, days, marker and sentence without a visible delay.

### Fitting a client budget
- As a freelancer, I want to know what to defer so the quote still holds.
  - [ ] Entering a budget shows "This budget covers X% of simulated outcomes".
  - [ ] If X is at or above the confidence: a sage "fits" message.
  - [ ] Otherwise: a list of tasks to move to phase 2, chosen only from non-pinned phase-1 tasks, and the
        resulting phase-1 price at the confidence, which is at or below the budget.
  - [ ] The suggestion defers as little estimated work as it can (it tries removing large tasks first, then
        puts back any that still fit).
  - [ ] If the pinned tasks alone exceed the budget at the confidence, it says so and suggests lowering
        confidence, raising the budget or unpinning a task.
  - [ ] "Move these to phase 2" moves them; tasks can be moved back individually.

### Client quote
  - [ ] Shows project, client, date, phase-1 task names, fixed price, delivery in working days.
  - [ ] Phase 2 (if any) appears as optional with an estimated range (10th to 90th percentile price).
  - [ ] A "How this was estimated" paragraph states the confidence in plain words.
  - [ ] Assumptions and "Prepared by" are editable on the page and saved with the project.
  - [ ] Printing hides the toolbar and fits one A4 page for up to about 15 phase-1 tasks.

## States and Boundaries
- **First use / empty project** — explanation, paste box, sample link; forecast panel shows an empty state
  ("Add hours to a task to see the forecast").
- **Some tasks without hours** — forecast uses the estimated ones and says how many still need hours.
- **Out-of-order range** — amber note on the row; forecast uses sorted values.
- **Zero or missing rate** — price shows "set a rate"; hours and days still show.
- **Budget impossible** — the pinned-tasks message above.
- **Persistence** — the project autosaves in this browser and is restored on reload. "New" asks for
  confirmation before clearing. Nothing leaves the browser.

## Product Decisions
- Confidence is chosen by the freelancer, not hidden — the point is to make the risk decision explicit.
- The tool suggests deferring scope, never reducing hours — cutting hours is how underquoting happens.
- Pinned "must-have" tasks are never suggested for phase 2.
- EUR only, one rate — the target user is a Belgian/EU solo freelancer.
- The quote does not show hour ranges per task — clients buy outcomes; the confidence statement is enough.

## What We're Building
Everything under **Features and Behavior** and **States and Boundaries**, with the sample project.

## Deferred From the POC
- Tracking actual hours to calibrate estimates — needs a project history.
- Read-only share link for clients — needs hosting decisions.
- VAT, currencies, multiple rates — not needed to prove the kernel.

## Possible Later Enhancements
- Personal "estimation bias" learned from past projects.
- Task templates for common work (auth, payments, admin panel).

## Non-Goals
- No accounts or server — the data is the freelancer's and stays in their browser.
- No AI-written task lists — the freelancer owns the scope decision.
- No scheduling or Gantt charts — different problem.

## Open Questions
- None blocking `4-spec`.
