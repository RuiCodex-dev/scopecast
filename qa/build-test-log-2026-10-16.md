# Scopecast: build and test QA (RUI-218), 2026-10-16

Project: `C:\Users\Admin\Desktop\Software\Hackathons\scopecast`. Remote: `https://github.com/RuiCodex-dev/scopecast` (public).
Machine: MSI, Node v22.18.0, npm 11.12.0, Python 3.13.7 with Playwright (headless Chromium launched by the scripts).

## 1. Fresh clone and "Try it"

- `git clone` into `scratchpad/clones/scopecast`. Clone HEAD = `02fbf392fd0dd6d911da6d809c10f3e216ac8540` = local HEAD = `git ls-remote` HEAD. 127 tracked files. Local working tree was clean.
- `npm install`: 45 packages added, 46 audited, **0 vulnerabilities**, no warnings (1 min).
- `npm ci`: same result, 0 vulnerabilities.
- `npm test`: **2 files, 28 tests, 28 passed** (1.5 s). Matches README "28 unit tests" and the Devpost text. Test list: 8 in `state.test.ts`, 20 in `engine.test.ts`.
- `npm run build` (= `tsc --noEmit && vite build`): passes, 43 modules, JS 256.34 kB (80.35 kB gzip), CSS 23.92 kB. No warnings. `npx tsc --noEmit`: exit 0.
- Engine requirements: vitest 5.0.3 needs Node `^22.12.0`; README said "Node.js 22+" (fixed to 22.12+).

## 2. End to end (vite preview + headless Chromium)

Repo script `scripts/e2e_check.py` against the clone's preview (screenshots to scratch, not the repo): **17/17 PASS** (paste dedupe, price, familiarity 2.5x, out-of-order flag, price rises with confidence [2500, 2700, 3050], sample 10 tasks, full quote EUR 12,050, budget 9,500 -> phase 2 -> EUR 9,400, reload, quote matches, one-page A4 PDF, 390 px no overflow, no page errors).

Own deep script `qa_e2e.py` (50 checks). Highlights, all on the sample project:

| Check | Result |
|---|---|
| Slider by keyboard (Home, ArrowRight x9, End) | 50..95 in steps of 5 |
| Hours P50..P95 | 133, 135, 136, 137, 139, 140, 142, 143, 146, 150 (monotonic) |
| Price P50..P95 | 11,350 ... 12,050 (P80) ... 12,750 (monotonic) |
| Exact P80 / P50 (engine) | 141.605 h / 133.429 h; 141.605 x 85 = 12,036 -> EUR 12,050 (rounded up to 50) |
| Known preset, likely 10 | best 8 / worst 13 |
| worst < best (worst 2) | amber note, read as 2 / 8 / 10, familiarity -> Custom |
| Negative best `-5` | stored and shown as 0 |
| Huge worst `99999999999` | clamped to 2000, price finite (EUR 57,800) |
| `abc`, empty, `0` likely | "needs hours", forecast says a task still needs hours |
| Decimal comma `6,5` | 6.5 |
| Budget 100,000 / 1,000 / `9.500` | fits / impossible (must-haves need EUR 5,750) / read as 9,500 -> phase 2 -> 9,400, fits |
| Move a task back from phase 2 | budget re-evaluated |
| Rate 0 / -40, hours/day 0 | "Set a rate" / clamped to 0 / clamped to 1 |
| Reload | price, task count, confidence identical; key `scopecast.project.v1` |
| Corrupt JSON / tampered storage | empty project, no crash / loads, cleans fields |
| Blocked localStorage (getter throws) | "not letting Scopecast save" note, sample still works, no errors |
| Every input/select/textarea/button | has an accessible name (0 unlabeled) |
| Mobile 390 px workbench | no overflow, no target under 24 px |
| Console errors / warnings / page errors | none |

Screenshots: `scratchpad/shots/qa/`, `shots/qa-fixed/`, `shots/fixes/`, `shots/repo-e2e*/`.

## 3. Hosted demo

None claimed. README and the Devpost draft say "No hosted demo"; Devpost "Try it out" is the GitHub repo. HTTP checks (all 200): GitHub repo, `https://youtu.be/hvNkFm73jgI`, `https://devpost.com/software/scopecast` (draft preview), `https://learn-ai-basics.devpost.com/`, raw README image on GitHub.

## 4. Docs vs reality

- README: every relative link exists (devpost/scope|prd|spec|checklist.md, design/STYLE_GUIDE.md, design/GENERATED_ASSETS.md, LICENSE, design/screenshots/04-after-phase2.png). File table paths exist. "28 unit tests" true. e2e script path and flags true.
- README example "within 99 hours, so the fixed price is EUR 8,400" did not reconcile at 85/h (99 x 85 -> EUR 8,450). **Fixed** to the measured sample: 141.6 h, EUR 12,050.
- PRD: 28 acceptance-criteria checkboxes and a 7-step journey (both as claimed); checklist has 5 slices (as claimed).
- AI_DISCLOSURE.md said the generated photos are used in "the README cover"; the README image is a real app screenshot, and GENERATED_ASSETS.md lists Devpost cover, video and thumbnail. **Fixed**.
- Devpost draft text (owner's, not edited): "16-step browser check" - the script has **17** checks (16 journey + "no page errors"). Its numbers EUR 12,050 / 142 h / EUR 9,400 / two tasks deferred all match the app.

## 5. Defects found and fixed (local commits, NOT pushed)

| Commit | Defect | Evidence after fix |
|---|---|---|
| `83a5db8` | Header "Sample" skipped its confirmation whenever `isSample` was true, so edits to the sample (hours, budget, phase 2) were discarded silently | pristine sample: no dialog; edited hours or budget: dialog; dismiss keeps the edit |
| `d396c48` | Quote silently omitted tasks without likely hours | no-print note "2 tasks have no likely hours and are left out of this quote"; hidden in print; PDF still 1 page |
| `d396c48` | Quote toolbar overflowed 57 px at 390 px (horizontal scroll), pre-existing | overflow 0 |
| `d396c48` | Assumptions textarea (fixed rows, resize none) clipped wrapped lines on screen AND in the printed PDF (scrollHeight 95 vs 71 at desktop print) | `field-sizing: content`: 95/95, 167/167 |
| `aec8c22` | README example numbers, Node 22.12+, AI disclosure wording | - |

Each commit: staged diff grep-scanned for keys/tokens/private keys (gitleaks not installed) - clean; full-tree scan at HEAD clean. After the fixes: `npm test` 28/28, `tsc` clean, build clean, repo e2e 17/17, fix script 11/11, deep script 47/50 (the 3 remaining are listed below; one is a script false-negative).

## 6. Not fixed (judgement calls, reported)

- "Add a task" (single add row) does not de-duplicate case-insensitively, unlike paste. The PRD only requires it for paste.
- Task-name textarea shows focus by a 1 px terracotta border and raised background rather than the global 2 px outline; visible but weaker than other controls.
- Pre-existing `design/screenshots/*` in the repo were not regenerated; the quote warning only appears when tasks lack hours, so they remain accurate.
- Devpost "16-step" wording (owner-editable text; actual is 17 checks).
- `DEVPOST_WRITEUP_DRAFT.md` (git-ignored) also says "16-check".

## 7. Processes

Started: two `vite preview` servers (127.0.0.1:4317 for the clone, :4318 for the project folder) and headless Chromium instances inside the Python Playwright scripts (each closed by `browser.close()`). TaskStop left the npx/cmd/node trees alive, so they were ended with `taskkill /T /F` on their own PIDs; both ports verified free and no `ms-playwright` process left. Nothing else touched.
