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

### Requirement: A matrix can read its cells from one record

With `cellsPath` CnChartWidget SHALL read the matrix from ONE record: the first record `filter` finds, else the first
`fallbackFilter` finds. It SHALL take the array at `cellsPath`, keep the cells whose fields equal every entry of
`cellFilter` (tokens resolved against the page record; nothing is read while one is unresolved), and lay them out as
the per-record mode does. Without a `rowOrder` / `columnOrder` list the order SHALL come from the arrays at
`rowOrderPath` / `columnOrderPath` on that record.

#### Scenario: A versioned matrix over three axes

- **GIVEN** a matrix record with `version` "v2", `behaviourAxis`, `severityAxis` and `cells[]` of
  `{ behaviour, severity, actorType, intervention }`
- **AND** a detail record with `matrixVersion` "v2", `actorType` "company", behaviour "2" and severity "C"
- **AND** `cellSource: { filter: { version: "@object.matrixVersion" }, cellsPath: "cells", cellFilter: { actorType:
  "@object.actorType" }, rowField: "behaviour", columnField: "severity", valueField: "intervention", rowOrderPath:
  "behaviourAxis", columnOrderPath: "severityAxis" }`
- **THEN** the company slice of matrix "v2" is drawn in the axis order of the record
- **AND** the cell in row "2", column "C" is outlined

#### Scenario: No matrix for that version

- **GIVEN** `filter` finds no record and `fallbackFilter: { active: true }` finds one
- **THEN** the cells of that record are drawn

