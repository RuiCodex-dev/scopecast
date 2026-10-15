---
doc: scope
status: approved
---

# Scopecast

A quoting tool for solo freelance developers that turns task ranges into a fixed price with a stated confidence level.

## The Unique Kernel
Instead of one optimistic number plus a gut-feel buffer, every task gets a range (best / likely / worst).
Scopecast simulates the project thousands of times and quotes a price and a delivery date **at a confidence
level you choose** ("85% of simulated projects finish within 31 working days and EUR 8,400"). When the
client's budget is lower, it tells you **which tasks to move to a phase 2** so the quote still holds at that
confidence, instead of quietly shaving hours.

## Who It's For
A solo freelance developer (like the owner, a one-person software company in Belgium) quoting a small
fixed-price job for a small-business client: a bakery that wants online ordering, a physiotherapist who
wants a booking page. Today they list tasks in a spreadsheet, put one number of hours next to each, add
"+20%" and hope. When a task blows up, they absorb the overrun unpaid.

## The Core Loop
1. Paste the client's feature list; each line becomes a task.
2. Give each task three numbers of hours (best, likely, worst), or pick how familiar the work is and adjust.
3. Read the forecast: a curve of "chance of finishing within this many hours", with the price and date at
   the chosen confidence.
4. Drag the confidence dial, enter the client's budget, and see what has to move to phase 2.
5. Open the client quote and print it to PDF.
They come back every time a new enquiry arrives; the habit it builds is quoting ranges, not wishes.

## Inspiration & Identity
A well-set estimate sheet from an architect's office: warm paper, black ink, one terracotta accent,
serif headings, tabular numbers, generous margins. Calm and trustworthy, not a startup dashboard.
No gradients, no glass, no stock 3D illustrations.
References: Edward Tufte's small, quiet charts (https://www.edwardtufte.com/), the PERT three-point
estimate (https://en.wikipedia.org/wiki/Three-point_estimation).

## Why This Matters to the Learner
The owner quotes fixed-price work as a one-person company. Underquoting is the most expensive mistake a
freelancer makes, and it happens because a single number hides the risk. He wants a tool he would use
himself the next time a client asks "how much?".

## What "Working" Looks Like
Open the app, paste eight feature lines from a real-looking client brief, set ranges, and a forecast curve
appears. Drag confidence from 50% to 90% and watch the price and date move. Type a client budget that is
too low: Scopecast lists the tasks to defer to phase 2 and shows the phase-1 quote now fits at that
confidence. Open the client quote page and print it.
The "oh, that's cool" beat: the budget fit. The tool says no, politely, with a concrete alternative.

## The POC Boundary
- One project at a time, saved in the browser.
- Paste-to-tasks, three-point ranges with familiarity presets, one hourly rate, hours per working day.
- Simulation, forecast curve, confidence dial, price and working-day estimate.
- Client budget and phase-2 suggestion (which tasks to defer).
- A printable client quote page.

## Later
- Track actual hours per task and learn your personal estimation bias.
- A library of past projects and reusable task templates.
- Share a read-only quote link with the client.
- VAT lines and multiple currencies.

## Explicitly Cut
- **Accounts, cloud sync, servers**: not needed to prove the kernel; everything runs in the browser.
- **AI that reads the client brief and writes the tasks**: needs a paid API key and hides the decision the
  freelancer must own; a line-per-task paste does the job.
- **Gantt charts and scheduling**: a different problem from "what do I charge".
- **Invoicing and payments**: out of scope for a quoting proof of concept.
