# Proposal: cell-formatter-page-record

## Why

DqZaaktypeVelden's Velden table has an "In de lijst" column: whether the case type shows the field as a column of
its case list. That is a fact of the case type (the page record), not of the field row, and an app's cell formatter
only received `(value, row, property, options)`.

## What changes

`CnCellRenderer` passes a fifth argument to an app formatter: `{ objectId, object }`, the detail page's record read
from `cnObjectContext` (CnDetailPage) or `cnDetailObjectContext` (the v2 grid), both null elsewhere. Existing
formatters ignore it.

## Reach

Every app formatter, opt in by reading the argument. No prop or schema change.
