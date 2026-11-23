# Proposal: board-wrapped-secondary-line-height

## Why

DqZoekresultaten r30: row 102.7 vs 100. The wrapped secondary line ran at the table's 1.35 (three lines of 18.9px; the board draws 16.8) right under the title (the board leaves 2px).

## What changes

In the board look a wrapping title cell's secondary line takes line-height normal and a 2px top margin. With thematiq fix/zuiddrecht-table-title-cell-15 (title 15px), probed on :8080 with the CSS injected: row 100.
