# stat-tile-board-look Delta: stat-widget-no-previous-text

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stat-widget-no-previous-text](../../)

## Purpose

A stat tile says when there is no earlier period to compare with.

## ADDED Requirements

### Requirement: A stat tile can name a missing earlier period

When a stat tile's content sets `previousField` and `noPreviousText` and does not set `deltaField`, and the loaded payload's previous value is missing, not numeric or `0`, the tile SHALL show `noPreviousText`, translated, where the trend sublabel stands. When the previous value is a non-zero number the trend SHALL show as before, and without `noPreviousText` no sublabel SHALL show.

#### Scenario: First month

- **GIVEN** a stat tile with `previousField: "previous"` and `noPreviousText: "No earlier period to compare with"`
- **WHEN** the endpoint answers `{ "value": 12, "previous": 0 }`
- **THEN** the tile shows 12 with "No earlier period to compare with" beneath it and no trend arrow
