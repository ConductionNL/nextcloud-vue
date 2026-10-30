# board-record-card-foot-leading Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-record-card-foot-leading](../../)

## ADDED Requirements

### Requirement: A record card footer line has normal leading

In the board look, a record card's footer (`.cn-object-card__record-foot`) SHALL set its line at normal leading, so a footer without a handler is as tall as drawn.

#### Scenario: DqZakenSorteren card without a handler

- GIVEN the cases cards view in the board look
- THEN the card "Afgewezen parkeervergunningen 2025" (no handler, "—") is as tall as on the board
