# board-page-header-top Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-page-header-top](../../)

## Purpose

A board page's title sits where the boards put it.

## ADDED Requirements

### Requirement: A board page title sits 4px under the content top

In the board look an index, detail or dashboard page's header SHALL start 4px under the content's top, and the index
and dashboard titles SHALL sit at the top of the title row, level with the header buttons.

#### Scenario: DqZaken

- **GIVEN** the cases index in the board look
- **THEN** the title and the header buttons start 4px under the content's top
- **AND** the count line starts 6px under the 40px title row
