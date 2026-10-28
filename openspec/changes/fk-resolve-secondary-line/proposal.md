# Proposal: fk-resolve-secondary-line

## Why

Board PqBiExport's Bestemming column shows a destination's name with its type beneath it ("Datawarehouse" /
"PostgreSQL"). The type is on the destination, not on the job the row is, so a column's `secondary` (read off the row)
cannot draw it. The `fkResolve` cell already holds the destination it resolves.

## What changes

- `widgetProps.secondaryTemplate` on the `fkResolve` cell: a muted second line filled from the resolved object.
- `widgetProps.secondaryLabels` (`{ field: { value: label } }`) turns the stored values the line names into words; a
  value without a label shows as stored.
