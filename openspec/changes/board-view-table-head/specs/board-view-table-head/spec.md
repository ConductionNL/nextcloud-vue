# board-view-table-head Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-view-table-head](../../)

## Purpose

An app's own table on the legacy `viewTable` class reads as the board's card table.

## ADDED Requirements

### Requirement: A board view table is the board's card table

In the board look a `viewTable` head cell SHALL be 14px at 600 with a 1.2 line height in the muted text colour, on the
board's table head ground, padded 10px 12px, with no rule under it. Its body cells SHALL be 14px with a 1.2 line height,
padded 11px 12px, with a hairline above each row. The Nextcloud look SHALL be unchanged.

#### Scenario: PqService "Opbouw in stappen"

- **GIVEN** a service with steps in the board look
- **THEN** the steps table head reads 14px at 600 on the board's head ground, not 15px at 500 on grey
