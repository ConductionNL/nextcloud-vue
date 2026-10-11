# view-switch-board-look Delta: screens-view-switch-parity

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-view-switch-parity](../../)

## Purpose

The board view switch with the four segments the index boards draw.

## ADDED Requirements

### Requirement: The manifest can draw segments the page cannot open

An index page SHALL accept `config.viewSwitch`, a list of unique modes from
`table`, `cards`, `board` and `map`. Under the board look each listed mode the
page cannot open SHALL render as a segment in the fixed order table, cards,
board, map, disabled, faded, with the mode's label as its accessible name and
the tooltip "<label>: not available on this list", and SHALL NOT emit a view
change when clicked. A listed mode the page can open SHALL render as an
ordinary segment, once. Without the key, or without the board look, the
switch SHALL render as before.

#### Scenario: PqTickets without a board or map config

- **GIVEN** `viewSwitch: ["table", "cards", "board", "map"]` on a page with no board config and no `mapConfig`
- **WHEN** the switch renders under the board look
- **THEN** four segments render, board and map disabled with "not available on this list" tooltips

#### Scenario: A page with a map

- **GIVEN** the same key and a `mapConfig`
- **WHEN** the switch renders
- **THEN** only the board segment is disabled

### Requirement: The segments carry the board's icons

Under the board look the segment icons SHALL be 18px, the table segment the
plain bulleted list icon, and the group SHALL be named "View mode" (Dutch
"Weergave").

#### Scenario: Dutch session

- **GIVEN** a board-look list in Dutch
- **WHEN** a screen reader reads the switch
- **THEN** it reads the group "Weergave" with segments "Tabel", "Kaarten", "Bord", "Kaart"
