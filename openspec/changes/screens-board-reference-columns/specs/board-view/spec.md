# board-view Delta: screens-board-reference-columns

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-board-reference-columns](../../)

## Purpose

An index page's board can take its columns from a field that references other rows, as board DqWerkbord draws the
cases board. A board without the new keys stays as it is.

## ADDED Requirements

### Requirement: Columns can be the rows a field references

A `columnFields` entry with a `source` SHALL take its columns from the rows of the referenced schema, fetched with one
list request per field, not from the values on the cards. The columns SHALL be ordered by `orderField`. Rows with
the same `mergeBy` value SHALL make one column. With `narrowBy` and one page filter value on `narrowBy.rowField`, the
columns SHALL be the rows of that parent only. A card SHALL sit in the column of the row it references.

#### Scenario: Statuses of two case types

- **GIVEN** statusType rows of two case types, both with "Ontvangen" and "In behandeling"
- **WHEN** the board shows the cases by status, merged by name
- **THEN** there is one "Ontvangen" column holding the cases of both types, and an empty stage is still a column

### Requirement: A board can switch the field its columns come from

With two or more `columnFields` the board view SHALL draw a "Columns:" select after the search. Picking a field
SHALL rebuild the columns from it. `narrow` SHALL draw a select that sets the page filter on its field. `hint` SHALL
draw one sentence after the controls.

#### Scenario: Status, type, assignee

- **WHEN** the person picks "type" in "Kolommen:"
- **THEN** the columns are the case types

### Requirement: A field without a referenced schema takes its values

A `columnFields` entry with `kind: "values"` SHALL take its columns from the values present on the rows, then one
column for no value, labelled `emptyLabel`.

#### Scenario: Assignee

- **WHEN** the person picks "behandelaar"
- **THEN** there is a column per assignee and a "Niemand" column

### Requirement: A drop writes the reference

A drop or a menu move on a reference column SHALL write the referenced row of the card's own parent. A column with no
row for that parent SHALL refuse the move. A named `moveHandler` SHALL make the move when given; else the field SHALL
be written with a PATCH. `readOnly` SHALL give no move.

#### Scenario: A bezwaar case to "In behandeling"

- **WHEN** a bezwaar case is dropped on the merged "In behandeling" column
- **THEN** its status is written as the bezwaar row of "In behandeling"

### Requirement: The board shows where a card can go

With `moveTargetsHandler` the board SHALL ask where a card may go when its menu opens or its drag starts. Columns out
of reach SHALL fade during the drag, read "not allowed" in the card menu, and refuse a drop without a write.

#### Scenario: A Woo case cannot skip to Besluit

- **WHEN** the person opens the menu of a Woo case in "Ontvangen"
- **THEN** "Besluit" reads "not allowed", and a drop on it is refused

### Requirement: Cards can be selected for bulk actions

With `selectable` every card SHALL carry a checkbox that feeds the page's selection, so the bulk band works on the
board.

#### Scenario: Select a card

- **WHEN** the person checks a card
- **THEN** the page's selection holds it

### Requirement: A wide board can wrap its columns

With `wrap` the columns SHALL wrap onto more rows, as many to a row as fit at 240px, instead of scrolling sideways.

#### Scenario: Many statuses

- **WHEN** a board has more columns than fit
- **THEN** they continue on the next row and nothing scrolls sideways

### Requirement: A card field can show through a formatter

`card.formatters` SHALL map a card role's field to a formatter id in the app's `cnFormatters` registry. The card SHALL
show that field's value through the formatter, as a table cell with that `formatter` does.

#### Scenario: The case type pill

- **GIVEN** `card.pill` is `caseType` and `card.formatters.caseType` is `caseTypeName`
- **THEN** the pill reads "Woo-verzoek", not the case type's id

### Requirement: The address can open a list in a view mode

An index page SHALL open in the view mode `?view=<mode>` names when the page offers that mode, and SHALL switch when
the address changes to another offered mode. A mode the page does not offer SHALL be ignored. A menu entry's `query`
can so open the one list of a schema as its board, without a second index page.

#### Scenario: The Werkbord entry

- **GIVEN** a menu entry to the Cases page with `query: { "view": "board" }`
- **WHEN** the person opens it
- **THEN** Cases opens in its board view
