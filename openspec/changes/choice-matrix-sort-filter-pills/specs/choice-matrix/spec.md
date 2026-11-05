# choice-matrix Delta: choice-matrix-sort-filter-pills

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [choice-matrix-sort-filter-pills](../../)

## Purpose

`CnChoiceMatrix` can draw board DqZaaktypeVelden's field rights: sortable and filterable heads, and pills in the cells.

## ADDED Requirements

### Requirement: A column head sorts the rows

With `sortable` every head of the grid SHALL carry a sort button. The row head SHALL sort the rows by label; a column head
SHALL sort them by the place of each cell's value (the stored value, else `defaultValue`) in `choices`, a value outside
them last, ties in their given order. A first click SHALL sort ascending and the next descending, and the sorted head SHALL
carry `aria-sort`. Without `sortable` the rows SHALL keep their given order and no sort button SHALL show.

#### Scenario: Sorting a role column

- **GIVEN** choices in the order required, edit, read only, hidden, and an Intake column holding hidden, required and edit
- **WHEN** the user clicks the Intake head
- **THEN** the rows read in the order required, edit, hidden

### Requirement: A column head filters the rows

With `filterable` every head of the grid SHALL carry a filter. The row head's filter SHALL keep the rows whose label holds
the typed text; a column head SHALL offer a tick per value that column holds, in the order of `choices`, and SHALL keep the
rows whose cell holds a ticked value. Filters on several heads SHALL all apply. When no row is left the grid SHALL say "No
rows match the filters.".

#### Scenario: Filtering two columns to nothing

- **GIVEN** an Intake filter keeping only "Required", which one row holds
- **THEN** that row alone shows
- **WHEN** a Team lead filter keeps "Edit", which that row does not hold
- **THEN** no row shows and the grid says no rows match

### Requirement: A read-only cell can be a pill

With `pills` a read-only cell SHALL be drawn as a `CnStatusBadge` with the choice's label, in the choice's `variant`, or
`default` when the choice names none. Without `pills` a read-only cell SHALL stay plain text.

#### Scenario: Board DqZaaktypeVelden "Verplicht"

- **GIVEN** the choice `required` with `variant: "info"` and `pills` on
- **THEN** a required cell shows a pill reading "Required" in the info variant
