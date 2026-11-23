# record-list Delta: screens-record-list-row-action

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-record-list-row-action](../../)

## Purpose

A work list says what to do next on every row, and how many rows each section holds.

## ADDED Requirements

### Requirement: A record list row can end in one action

A `rows` record list with `rowAction` SHALL end every row with that action, labelled by `labels.map[row[labels.field]]`
when present, else by `label`. An action that only navigates (`open-page`, `navigate`) SHALL be a link for that row.
Any other action SHALL be a button that dispatches with the row. A list without `rowAction` SHALL render as before.

#### Scenario: Action items by status

- **GIVEN** a record list with `rowAction` `{ type: "handler", handler: "complete", label: "Afronden", labels: { field: "status", map: { open: "Starten" } } }`
- **WHEN** it shows a busy item and an open item
- **THEN** their actions read "Afronden" and "Starten", each a 150px by 34px pill at the end of the row

### Requirement: A dashboard card can show its list's count after the title

A record list with `headerCount: true` SHALL report its total with its header, and the dashboard card SHALL draw that
total as a chip after the card title. A card whose widget reports no count SHALL draw no chip.

#### Scenario: Section counts

- **GIVEN** a dashboard with a record list card "Actiepunten" with `headerCount: true` whose list totals 5
- **WHEN** the card renders
- **THEN** a chip reading "5" follows the title
