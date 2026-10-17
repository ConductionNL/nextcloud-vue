# matrix-cell-records Delta: matrix-cell-records

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [matrix-cell-records](../../)

## Purpose

A matrix chart can draw a matrix the app keeps as records, one per cell, so each install shows its own matrix.

## ADDED Requirements

### Requirement: A matrix can read its cells from records

CnChartWidget SHALL take `cellSource` `{ register, schema, filter?, rowField, columnField, valueField, ... }` on a
`matrix`. It SHALL list the records of that register and schema with `filter`, tokens resolved against the record on a
detail page, and SHALL NOT list while a filter token is unresolved. Each record SHALL fill the cell its `rowField` and
`columnField` name with its `valueField`; a record without a row or column SHALL be skipped and the first record for a
cell SHALL win. Rows and columns SHALL be labelled from `rowLabels` / `columnLabels`, else `rowLabelField` /
`columnLabelField`, else the key, and ordered by `rowOrder` / `columnOrder`, else `rowOrderField` / `columnOrderField`,
else natural order. `valueLabels` SHALL give the text of a stored value, and `colorMap` SHALL tint by the stored value or
that text. `highlight` SHALL match the row key and the column key. Without `cellSource` the matrix SHALL draw as before.

#### Scenario: A matrix kept per install

- **GIVEN** a detail page whose record names `matrixVersion` "v2", behaviour "2" and consequence "B"
- **AND** a matrix with `cellSource: { filter: { matrix: "@object.matrixVersion" }, rowField: "behaviour",
  columnField: "consequence", valueField: "step" }` and `highlight: { row: "@object.behaviour", column: "@object.consequence" }`
- **THEN** the cell records of matrix "v2" are listed and laid out by behaviour and consequence
- **AND** the cell in row "2", column "B" is outlined

#### Scenario: The version is not known yet

- **GIVEN** the same matrix while the record has no `matrixVersion`
- **THEN** nothing is listed until the record names one
