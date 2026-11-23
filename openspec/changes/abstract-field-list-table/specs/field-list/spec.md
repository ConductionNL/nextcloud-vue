# field-list Delta: abstract-field-list-table

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [abstract-field-list-table](../../)

## Purpose

Draw the entries of a field-list as a table with a row menu, a warning band and an add button, from configuration.

## ADDED Requirements

### Requirement: A field list can be drawn as a table

With `content.variant: "table"` and `content.columns`, the `field-list` widget SHALL draw a header row and one table
row per entry with the configured columns, a status pill for a `pill` column and a bold cell for a `strong` column.
Without `variant` the list rows SHALL stay as they are.

#### Scenario: Domeinen

- **GIVEN** two domains and columns Domein, Status (pill) and Certificaat
- **WHEN** the widget renders with `variant: "table"`
- **THEN** a table with a header row and two rows shows, each status as a pill

### Requirement: A table row has a menu, and a detail line is a warning band

In the table variant each row SHALL have a "..." menu named after the row holding its row actions (except those with
`placement: "band"`) and remove. A row's `detail` line SHALL be drawn as a warning band under the table, with the row
actions marked `placement: "band"` as buttons.

#### Scenario: A domain waiting for verification

- **GIVEN** an unverified domain with a detail line and a band action "Check again"
- **WHEN** the widget renders
- **THEN** the band shows the line under the table and the button runs the action for that row

### Requirement: The add form can open from a button

With `add.trigger: "button"` the add form SHALL show only after the button (above the rows with
`add.placement: "header"`, else below them) is pressed and SHALL close after a successful add.

#### Scenario: Inlogwijze toevoegen

- **WHEN** the person presses the header button and adds an entry
- **THEN** the form opens, the entry is saved with one PATCH and the form closes
