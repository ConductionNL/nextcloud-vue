# record-list-table-shape Delta: record-list-table-shape

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-table-shape](../../)

## Purpose

A record list table can indent, sort, colour and link its rows, and take them from a list inside each record.

## ADDED Requirements

### Requirement: A record list table takes its shape from the rows

With `presentation: "table"`, a list with `indentPath` SHALL indent the first cell of a row by 16px per level of the
number at that path. A column with `sortable: true` SHALL have a header button that sorts the rows ascending on the
first press and descending on the next, comparing numbers as numbers, and SHALL set the header's `aria-sort`. A column
with `tone` SHALL draw its cell as a badge whose variant is looked up in `tone.map` by the value at `tone.field` (or
the cell text), falling back to `tone.default`; while `tone.override.when` holds for the row the variant SHALL be
`tone.override.tone`. A list with `flattenPath` SHALL draw one row per entry of the list at that path on each record,
with the record readable at `@parent`, and SHALL count those rows as its total. With `rowRoute` the first cell SHALL
link to the row's route.

#### Scenario: Departments as a tree

- **GIVEN** rows with depth 0, 1 and 2 and `indentPath: "depth"`
- **THEN** the second row's first cell is indented 16px and the third 32px

#### Scenario: A verdict that is green only when verified

- **GIVEN** a verdict column mapping `compliant` to `success`, with an override to `warning` while `verified` is not
  true
- **THEN** a verified compliant feature reads green and an unverified compliant feature reads amber

#### Scenario: Free text answers across responses

- **GIVEN** responses each holding `answers` and `flattenPath: "answers"`
- **THEN** each answer is one row, its course read from `{@parent.course}`, and a response without answers adds none
