# Proposal: badge-cell-list

## Why

Board PqBiExport draws a job's datasets as chips ("ticket", "client"); live printed the list as one text
("ticket, client"). A `badge` cell drew one badge for one value only.

## What changes

- A `badge` cell whose value is a list draws one chip per non-empty entry, in a wrapping row, with
  `widgetProps.variant` (default `default`); an empty list draws the dash. A single value draws as before.
