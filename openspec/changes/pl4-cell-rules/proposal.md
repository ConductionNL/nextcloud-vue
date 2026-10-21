# pl4-cell-rules

## Why

pipelinq draws two lead cells and an overdue row of its own because three row conditions were missing from the
library: a due date that stops being due once the record is closed, a number flagged below a bound, and a row class
that needs two conditions at once. Each one is generic, so each becomes an option and the lead cells become manifest
config.

## What changes

- CnCellRenderer `date` cell: `widgetProps.due.activeWhen` (`{ field, equals | in | lt | gt }`). While it does not hold
  on the row, the date reads as the short date in no colour, never overdue or due soon.
- Row conditions (`indicatorApplies`, used by row indicators, `flagWhen` and `titleWhen`) take numeric `lt` and `gt`.
- A row-class rule's `when` may be a list; the rule applies when every condition holds.
- The v2 manifest schema takes the `when` list and `lt` / `gt` on a row indicator (2.139.0).

## Fleet reuse

- pipelinq `LeadCloseDateCell` is the `date` cell with `due.activeWhen`; `LeadProbabilityCell` is the `number` cell
  with `flagWhen.lt`; the lead list's overdue row is a `rowClass` rule with two conditions.
- shillinq invoice due dates (a paid invoice is never overdue) and planninq task due dates (done) use `activeWhen`.
