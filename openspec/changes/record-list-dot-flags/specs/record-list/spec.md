# record-list Delta: record-list-dot-flags

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [record-list-dot-flags](../../)

## Purpose

Draw a status list with colours and start/end flags.

## ADDED Requirements

### Requirement: A record-list row can carry a colour dot and flag text

A `rows` record-list SHALL draw a colour dot before a row's title from `content.dot` (a field, or `{ field, colorMap }`) when the colour is a hex, `rgb()`/`hsl()` or `var(--…)` value, and SHALL draw at the row's end the labels (through the host translate, joined with " · ") of the `content.flags` entries whose field is true or equals their `value`. Without the keys rows SHALL render as before.

#### Scenario: Statuses

- **GIVEN** a statuses list with `dot: "color"` and flags Start (`isStart`) and End (`isEnd`)
- **WHEN** "Ontvangen" has colour `#234a78` and `isStart: true`
- **THEN** its row shows a dark blue dot before the name and "Start" at its end
