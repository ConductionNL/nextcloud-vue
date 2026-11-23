# Proposal: board-filter-row-one-beside-side-panel

## Why

r29 on :8080: with the side panel open the Filter + view switch unit wrapped as one to row 2; the boards (DqFilterBeheren, DqFilterInMenu, DqZakenSorteren) keep Filter on row 1 after Weergave opslaan and wrap the view switch alone.

## What changes

In the board look, while the side panel is open, the unit dissolves into the toolbar row, so Filter and the switch wrap on their own. Probed on :8080 with the CSS injected: Filter at x 940 on row 1, the switch at the start of row 2.
