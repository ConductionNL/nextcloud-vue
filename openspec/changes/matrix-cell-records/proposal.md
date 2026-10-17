# Proposal: matrix-cell-records

## Why

Some apps keep a matrix as data, one record per cell (the row it sits in, the column, the value), with a version per
install. A `matrix` chart (chart-bar-list-and-matrix) could only draw a matrix written into the manifest or returned by
an endpoint already laid out in rows. Written into the manifest, every install shows the same matrix, and it drifts from
the version the app computes with, which nobody notices. Board DqHandhaving draws such a matrix on a detail page with
the record's cell outlined.

## What changes

- CnChartWidget takes `cellSource`: the cell records are listed from a register (`register`, `schema`, a token-resolved
  `filter`) and laid out by `rowField` / `columnField` with `valueField` as the cell.
- Labels from maps or fields, order from lists or a numeric field, `valueLabels` for the text of a stored value.
- `highlight` matches the row and column keys of the cell records.
- With `cellsPath` the matrix sits inside ONE record (a versioned matrix with a `cells[]` array, as dossiq's `lhsMatrix`):
  the first record `filter` finds, else `fallbackFilter`, its cells narrowed by `cellFilter`, the axis order from
  `rowOrderPath` / `columnOrderPath`.
- New utils `matrixCells.pivotCells` and `cellsFromRecord` do the layout; the list reuses `fetchReferenceObjects`.
- Manifest schema 2.124.0 types `cellSource`.

Stacked on chart-bar-list-and-matrix (#1734). Nothing changes for a matrix without `cellSource`.
