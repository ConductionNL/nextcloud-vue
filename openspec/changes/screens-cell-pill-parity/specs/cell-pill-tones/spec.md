# cell-pill-tones Delta: screens-cell-pill-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-cell-pill-parity](../../)

## Purpose

The status pills of a table cell take the tones the boards draw, declared per
column in the manifest. Without a declaration a pill renders as before.

## ADDED Requirements

### Requirement: A status pill has eight tones

`CnStatusBadge` SHALL accept the variants `default`, `primary`, `success`,
`warning`, `error`, `info`, `purple` and `teal`, as its `variant` prop and as
values of its `colorMap`. `purple` SHALL draw background
`--cn-status-purple-bg` (default #e8e6f6) with text `--cn-status-purple-text`
(default #4a3f8f); `teal` SHALL draw `--cn-status-teal-bg` (default #e3f1f3)
with `--cn-status-teal-text` (default #1d5e66). The defaults SHALL be defined
once as tokens a theme may redefine. The board card pill (`cardRoles.pillColors`)
and the detail header pill (`headerPill`) SHALL accept the same eight names,
and the manifest schema SHALL list them in each of those enums.

#### Scenario: In behandeling in purple

- **GIVEN** a badge with `colorKey: "in_progress"` and `colorMap: { in_progress: "purple" }`
- **WHEN** it renders
- **THEN** it carries the class `cn-status-badge--purple` and reads its colours from the purple tokens

#### Scenario: An unknown tone

- **GIVEN** `variant: "magenta"`
- **WHEN** the prop is validated
- **THEN** the validator refuses it

### Requirement: A manifest column colours its enum pills

A table column object MAY carry `colorMap`, an object mapping a raw enum value
to a tone. `CnDataTable` SHALL hand it to `CnCellRenderer` as the property's
`colorMap`, so the pill colour is looked up by the raw value while the label
stays the translated one. The column map SHALL win over the schema property's
`colorMap` / `x-color-map`. A value the map does not name, a column without a
map, and a `colorMap` that is not an object SHALL render the pill as before.

#### Scenario: PqTickets status column

- **GIVEN** the column `{ key: "status", colorMap: { new: "primary", in_progress: "purple", converted: "teal" } }` and rows with status `in_progress` and `converted`
- **WHEN** the table renders
- **THEN** the first row's pill is purple and the second row's pill is teal

#### Scenario: The column wins over the schema

- **GIVEN** a schema property with `x-color-map: { qualified: "purple" }` and the column `{ key: "stage", colorMap: { qualified: "warning" } }`
- **WHEN** a row with stage `qualified` renders
- **THEN** its pill is warning

#### Scenario: No map

- **GIVEN** an enum column without `colorMap` and a schema property without one
- **WHEN** the table renders
- **THEN** every pill is the default tone, as before

### Requirement: A primary pill uses the deep primary ink under the board look

Under the board look a `primary` pill that is not `solid` SHALL draw its text
in `--color-primary-element-light-text` on `--color-primary-element-light`,
as the board draws "Verzoek". Without the look, and inside a page with
`config.look: "nextcloud"`, the text SHALL stay `--color-primary-element`.

#### Scenario: Verzoek on PqTickets

- **GIVEN** an app with `look: "board"` and a type column mapping `request` to `primary`
- **WHEN** a request row renders
- **THEN** the "Verzoek" pill text is `--color-primary-element-light-text`
