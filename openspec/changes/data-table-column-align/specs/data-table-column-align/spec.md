# data-table-column-align Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [data-table-column-align](../../)

## Purpose

A table column can sit at the end of its cells, as a column of numbers does.

## ADDED Requirements

### Requirement: A column can align to the end

A CnDataTable column with `align: "right"` or `align: "end"` SHALL draw its header and its cells at the end of the
cell. A column without `align`, or with `align: "left"`, SHALL draw at the start.

#### Scenario: Board PqKassabon line totals

- GIVEN an object list of receipt lines whose Aantal, Stukprijs, Korting, Btw and Regeltotaal columns set `align: "right"`
- WHEN the receipt opens
- THEN those headers and values sit at the end of their column
- AND Omschrijving stays at the start
