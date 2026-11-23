# board-description-select-sized-to-choice Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-description-select-sized-to-choice](../../)

## Purpose

A select on a board dashboard's description line is as wide as its placeholder or choice, in the board's select type.

## ADDED Requirements

### Requirement: A description select is sized to its choice

In the board look, a `CnDashboardPage` description-line select SHALL size its search input to its content, pad it 10px
at the start, and set its text in 14px at weight 500. The Nextcloud look keeps NcSelect's own sizing.

#### Scenario: DqDoorlooptijd "Filteren op zaaktype"

- **GIVEN** the processing-time report in the board look with no case type chosen
- **THEN** the select is about 140px wide, showing "Alle zaaktypen"
