# files-browser Delta: files-browser-side-cards

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [files-browser-side-cards](../../)

## Purpose

A documents list says what is selected in the app's words, tells more about the selected file, and draws values in tones.

## ADDED Requirements

### Requirement: The bulk bar names what is selected

With `selectionLabel` the bulk bar SHALL read that template, translated by the app, with `{count}` replaced by the number of selected files, and `selectionLabelOne` when one file is selected. With `showClearSelection` false it SHALL leave out Clear selection. Without them it SHALL read "{count} selected" and offer Clear selection, as before.

#### Scenario: Two documents

- **GIVEN** `selectionLabel: "{count} documenten geselecteerd"`
- **WHEN** two files are ticked
- **THEN** the bar reads "2 documenten geselecteerd"

### Requirement: Cards beside the list describe the selected file

With `sideCards` and at least one selected file, the browser SHALL draw beside the list a column, named after the last selected file, with one card per entry: its `title` with `{name}` replaced by the file name, each field that has a value as a label and value read from the row data (`source: "row"`, default) or the node (`source: "node"`), and its `actions`, which SHALL run on that file as row actions do. Without a selection there SHALL be no column.

#### Scenario: Who can see this

- **WHEN** the user ticks Offerte verlichting.pdf last
- **THEN** a card reads "Wie mag dit zien: Offerte verlichting.pdf" with the file's visibility fields and "Uitzondering wijzigen"

### Requirement: A row column can draw its values in tones

A column or card field with `colorMap` SHALL look its value (or, with `colorKey`, that row field) up in the map, ignoring case. With `widget: "badge"` the cell SHALL be a pill in the found tone; otherwise the value SHALL be drawn in the tone's colour. A value with no entry SHALL render as before. A `row` key (of a column, a card field or `colorKey`) MAY be a dotted path into the host's record; a key the record holds as written SHALL win.

#### Scenario: A scan verdict and a restricted level

- **GIVEN** the Scan column `{ widget: "badge", colorMap: { clean: "success", infected: "error" } }` and the visibility column `{ colorKey: "level", colorMap: { restricted: "warning" } }`
- **THEN** a clean file shows a green pill, an infected one a red pill, and a restricted file's visibility text is drawn in the warning colour
