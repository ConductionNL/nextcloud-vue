---
kind: code
---

# Proposal: dashboard-tile-text-fits

## Summary

On the review instance of 11 October 2026 (findings F4 and F7), two pieces of
dossiq's dashboard text were cut off.

1. The KPI tiles cut their text to one line. The caption "haalden hun termijn,
   naar doorlooptijd" read "haalden hun termi…", and the label "Afgehandeld
   deze maand" was cut at the tile edge. The DqDashboard board wraps both.
2. The "Recently opened" tile put the case number ("2026-0004") beside the
   title instead of under it, so it ran out of the tile. In the board look the
   secondary line is an inline block (so the title underline does not reach
   it), and in a `fitWidth` table the title cell does not wrap, so the inline
   block stayed on the title's line.

## What changes

1. The caption line of a stacked KPI tile (`cn-kpi-card__caption-line`, the
   caption and the note) wraps, up to two lines.
2. In the board look the KPI tile's label wraps too, up to two lines, beside
   its icon badge. `CnStatWidget` gives the label its own class,
   `cn-kpi-card__title-text`, so the rule has a target.
3. In a `fitWidth` table the secondary line of the growing column
   (`cn-table-cell__secondary`) is a line of its own under the value, cut with
   its own ellipsis. It is taken out of the flow, so in the board look the
   title underline still does not reach it.

The value of a KPI tile still never wraps. Tables without `fitWidth` are not
changed.
