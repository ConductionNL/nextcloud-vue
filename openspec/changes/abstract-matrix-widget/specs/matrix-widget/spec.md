# matrix-widget Delta: abstract-matrix-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-matrix-widget](../../)

## Purpose

Draw and edit a rows-by-columns grid from configuration, instead of an app component per grid.

## ADDED Requirements

### Requirement: A matrix pivots objects into rows and columns

The `matrix` widget SHALL take its rows from `rows` (a list of objects or ids from a source, or an array field of
the page object) and its columns from `columns` (a static list, a source, or an array field), and SHALL place each
object of `cells` in the row named by its `rowKey` field and the column named by its `columnKey` field, showing its
`value` field mapped through `valueMap`. Every page of each source SHALL be read; past `maxRows` objects the widget
SHALL show the first `maxRows` and say so, instead of showing a partial grid as whole. Row labels SHALL come from `rows.label`
(a template) or, for ids, from a `rows.lookup` source matched on one field. Rows SHALL be grouped under a group row
when `rows.groupBy` names a field.

#### Scenario: A gradebook

- **GIVEN** a cohort of three learners, a plan with two components and four grade entries
- **WHEN** the widget renders with rows from the cohort's `learnerIds` and columns from the plan's `components`
- **THEN** it shows three rows labelled with the learners' names and two columns, with each mark in its cell

### Requirement: A matrix writes one cell at a time

With `write.cells`, typing a value SHALL patch the cell object when one exists and create one otherwise, carrying the
row key, the column key, the value and `write.cells.values` (tokens resolved). With `write.endpoint`, the value SHALL
be sent to that endpoint instead. A cell whose object matches `write.cells.lockedWhen` SHALL not be written and SHALL
show `lockedText`. A number column SHALL refuse text that is not a number. A refused write SHALL show the server's
message and keep the stored value.

#### Scenario: A new mark

- **GIVEN** a learner without a grade entry for a component
- **WHEN** the teacher types 7.5 in that cell
- **THEN** one object is created with the learner, the component and the value 7.5

#### Scenario: A published mark

- **GIVEN** a grade entry whose lifecycle is `published` and `lockedWhen` `{lifecycle: published}`
- **WHEN** the teacher edits that cell
- **THEN** nothing is written and the locked text is shown

### Requirement: A matrix can edit one array field of the page object

With `field`, the rows SHALL be the entries of that array field of the page object and each cell a property of an
entry. Every edit SHALL re-read the stored object and PATCH only that field, with the change applied to the stored
list.

#### Scenario: An hour plan

- **GIVEN** an hour plan whose `activities` hold hours per week
- **WHEN** the planner changes week 3 of one activity
- **THEN** one PATCH carries `activities` with only that value changed

### Requirement: A matrix shows totals and checks them against norms

`totals.columns` SHALL add a totals row and `totals.rows` a totals column. `norms` SHALL add a norm row (values per
column, or read from an array field of the page object), and a column total above its norm SHALL be marked and said
in text, not by colour alone. A column with `markBelow` SHALL mark each value below it with its `markLabel`.

#### Scenario: Hours over the norm

- **GIVEN** a norm of 40 for week 2 and a total of 44
- **WHEN** the widget renders
- **THEN** the week 2 total is marked as over the norm

### Requirement: A matrix runs row actions and one bulk transition

`rowActions` SHALL run a lifecycle transition on the row object when its `when` matches. `bulkAction` SHALL run its
transition on every target matching `when` (cell objects, or row objects with `scope: rows`), optionally limited to
one chosen column, after a confirm that names the count. It SHALL report how many succeeded and list each refusal
with the row, the column and the server's reason.

#### Scenario: Publishing a column

- **GIVEN** five concept marks in one column, one of which the server refuses
- **WHEN** the teacher publishes that column and confirms
- **THEN** four are published and the report lists the refused mark with its reason

### Requirement: Matrix cells are reachable by keyboard

An editable cell of CnDataMatrix SHALL be focusable and SHALL open its editor on Enter or F2, and its accessible name
SHALL name its row and column. Escape SHALL cancel the edit.

#### Scenario: Editing without a mouse

- **GIVEN** an editable matrix
- **WHEN** the user tabs to a cell and presses Enter, types 6 and presses Enter
- **THEN** `cell-edit` is emitted with the value 6
