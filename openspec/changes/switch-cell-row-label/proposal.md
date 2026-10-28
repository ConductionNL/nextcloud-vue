# Proposal: switch-cell-row-label

## Why

Board PqBiExport draws Ingeschakeld as a bare switch per job. The `switch` cell's only label is the cell value, so a bare
switch would have no accessible name (WCAG 2.2 SC 4.1.2), and showing the value ("true") is not what the board draws.

## What changes

- `widgetProps.ariaLabel` on the `switch` cell, a string or a function of the row: the switch shows no value and is named
  with that text for screen readers only (a visually hidden label inside the switch).
