# board-select-control Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-select-control](../../)

## Purpose

A select reads as the board's control.

## ADDED Requirements

### Requirement: A board select is the board's control

In the board look, outside a board dialog, an NcSelect's field SHALL have a 1px edge in `--cn-board-control-border`
and radius `--cn-board-control-radius`, with no inner ring. It SHALL be 40px high, or 36px inside a dashboard page
filter, set through `--cn-board-select-height`. The Nextcloud look SHALL keep NcSelect's own field.

#### Scenario: DqProcesanalyse "Periode"

- **GIVEN** the process analysis page in the board look
- **THEN** the "Periode" select is 36px high with a 1px grey edge
