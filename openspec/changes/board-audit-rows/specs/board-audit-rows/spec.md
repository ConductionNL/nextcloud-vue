# board-audit-rows Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-audit-rows](../../)

## Purpose

An audit card's rows in the board look are the boards' list rows.

## ADDED Requirements

### Requirement: A board audit row is the board's list row

In the board look, a `CnAuditTrailCard` row SHALL pad 10px above and below, with a hairline over it (also over the first
row) and none under it, and SHALL set its head and its second line at their normal line height, 2px apart. The Nextcloud
look keeps its own rows.

#### Scenario: DqHandhaving "Historie"

- **GIVEN** an LHS recommendation page in the board look with history entries
- **THEN** each two-line row is 56px and the first line starts about 21px under the card title
