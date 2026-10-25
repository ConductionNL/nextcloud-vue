# The record task table sorts and filters from its heads

## Why
DqZaakTaken draws a sort chevron and a filter funnel on every head of the case's task table ("Taak", "Behandelaar", "Deadline", "Status"). The live table had plain heads, 37px high against the board's 42.5 (r26c), and offered neither sorting nor filtering.

## What changes
CnTasksWidget's table takes `content.sortable` and `content.filterable`:
- A head's label sorts by its column, ascending then descending, with `aria-sort`. The deadline sorts by date.
- The funnel offers the column's values as checkboxes and keeps the rows that hold a chosen one.
- Without a sort, open tasks stay first.
- The funnel's label reuses "Filter by {column}".

No schema change.
