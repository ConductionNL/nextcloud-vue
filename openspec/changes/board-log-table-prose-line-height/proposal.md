# A plain log's prose cell runs at line height 1.45

## Why

DqZaakContact draws the contact summary (a wrapping prose column) at line height 1.45, so a two-line row is 61.6 high. Live runs it at normal (57; r26c rowHeight 61.6 vs 57).

## What changes

- Board look: in a table whose title column reads as plain text (`rowTitle: "text"`), a `cn-cell--wrap` cell has line-height 1.45. Probed on :8080 with the rule injected: 63.6 (the 2px left is the cell padding 11 vs 10, within tolerance).
