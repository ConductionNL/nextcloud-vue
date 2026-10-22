# Proposal: board-chart-footnote

## Why

The board draws a bar list's footnote ("Klik een balk om de zaken te zien", DqDashboard "Zaken per status" and
"Zaken per type") as a small muted line: about 13px in the soft ink. Under a bar list or matrix the footnote sits inside
the chart's HTML body, where it took the 15px paragraph text in the full ink, which thematiq sets on every `p` with `!important`. Only the footnote under an ApexCharts plot
had the board's 13px.

## What changes

In the board look a footnote under a bar list or a matrix is 13px at normal line height, in the muted text colour.

## Scope

Board-only, `look-board.css`. The Nextcloud look is unchanged.
