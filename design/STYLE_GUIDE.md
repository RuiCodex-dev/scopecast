# Scopecast style guide

One visual system for the app, the client quote, the Devpost images and the demo video.
Idea: **an estimate sheet from a good architect's office** — warm paper, black ink, one terracotta
accent, quiet charts. Calm and trustworthy, never a startup dashboard.

## Palette (7 tokens + washes)

| Token | Hex | Use |
|---|---|---|
| `paper` | `#F3EEE4` | Page background (with a 3 px dot grain at 3.5% ink) |
| `paper-deep` | `#E9E2D3` | Likely-range band in the chart, quote "desk" background |
| `ink` | `#1F1C17` | Text, the curve, primary buttons |
| `graphite` | `#5C574E` | Secondary text, axes, range bars |
| `rule` | `#CFC6B4` | Hairlines and input borders (no drop shadows anywhere) |
| `terracotta` | `#B8502E` | The one accent: confidence marker, slider, focus ring, "Move to phase 2" |
| `sage` | `#5E7B62` (text `#4A6550`) | "Fits" states, the budget line when it fits |
| `ochre` | `#B88A2B` (text `#765812`) | Warnings: out-of-order ranges, "needs hours", sample tag |

Washes (`terracotta-wash #F0DCCF`, `sage-wash #DDE5D8`, `ochre-wash #F1E4C6`) are used only behind
verdict messages. One accent per view; terracotta never decorates.

Contrast (measured): ink on paper 14.7:1, graphite on paper 6.2:1, ochre text on ochre wash 5.3:1,
sage text on paper 5.6:1, white on terracotta 5.0:1 — all WCAG AA for body text.

## Type (two families, both SIL Open Font License 1.1, self-hosted via `@fontsource`)

- **Fraunces** (500 for headings and the big price, 400 italic for emphasis) — warm, editorial serif.
- **IBM Plex Sans** (400, 600) for UI and every number; tabular lining figures (`tnum`, `lnum`) so prices
  do not jump when they change.

Scale: 68 (price) · 38 (quote title) · 26 (panel titles) · 21 (intro) · 17 (group labels) · 15 (body) ·
13 (meta) · 12 (eyebrows, uppercase, 0.08em tracking).

## Spacing, shape, motion

- 8 px scale (4, 8, 12, 16, 24, 32, 48, 64). Radius 6 px (inputs, buttons), 10 px (paste box). Pills only
  for familiarity chips.
- Hairline rules separate sections; no cards with shadows.
- Motion: 160 ms `cubic-bezier(0.2, 0.7, 0.2, 1)`; the price settles 2 px when it changes.
  `prefers-reduced-motion` turns all animation off.

## Icons

One family drawn for Scopecast in `src/components/icons.tsx`: 24 px grid, 1.6 px round strokes, no fills.
The mark is an ink tile with a cream S-curve and a terracotta confidence marker.

## Charts

Tufte-quiet: a 2 px ink curve, a paper-deep band for the 10th–90th percentile, three light grid lines,
a terracotta dashed marker at the chosen confidence, a dashed budget line (sage when it fits, ochre when
not). Labels in the UI face at 11–12 px. No legends, no 3D, no gradients.

## Photography (marketing only, never in the product UI)

Editorial still life and interiors: soft window light, medium-format film look, fine grain, muted
cream / ink / terracotta / sage. No people's faces, no text in images, no screens with content.
All generated images are logged in `GENERATED_ASSETS.md` and graded with `design/scripts/grade.py`.
Any words that appear over an image are real typography set in Fraunces / IBM Plex Sans.

## Copy

Second person, short, plain. Explain any statistics word in one line where it appears
("80% confidence: in 8,000 of 10,000 simulated runs …"). Never promise accuracy we do not have.
