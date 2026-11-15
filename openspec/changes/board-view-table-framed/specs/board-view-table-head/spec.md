# board-view-table-head Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-view-table-framed](../../)

## ADDED Requirements

### Requirement: A framed board view table is the board's framed card table

In the board look a `viewTable` inside a `viewTableContainer` SHALL inset its first and last cells 18px, pad its rows
12px and draw a hairline under each row but the last. The Nextcloud look SHALL be unchanged.

#### Scenario: PqService "Opbouw in stappen"

- **GIVEN** the service detail page in the board look
- **THEN** the steps table's "#" column starts 18px inside the frame and each row is 41.5px, as the board draws it
