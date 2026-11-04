# record-list-inline-row-actions Delta: record-list-inline-row-actions

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-inline-row-actions](../../)

## Purpose

A row with one or two acts that matter shows them directly, such as approve and reject on the step that waits.

## ADDED Requirements

### Requirement: Row actions can be buttons on the row

With `rowActionsInline: true`, `CnRecordListWidget` SHALL draw the row's visible `rowActions` as buttons on the row and no
menu. A button SHALL run the entry as the menu would, or link when the entry has an `href`. An entry's `variant` SHALL set the
button's look, and its `ariaLabel` template, filled from the row, its accessible name. A row without visible actions SHALL
draw no buttons. Without the key the menu SHALL stay.

#### Scenario: Board DqZaakBesluiten "Route van het besluit"

- **GIVEN** a step that waits and a finished step, both actions `visibleWhen` the state is waiting
- **THEN** the waiting step has the buttons "Goedkeuren" and "Afwijzen", and the finished step has none
- **WHEN** the user presses "Goedkeuren"
- **THEN** the entry's endpoint is called for that step and the list reads again

#### Scenario: Without the key

- **GIVEN** `rowActions` without `rowActionsInline`
- **THEN** the actions sit in the menu
