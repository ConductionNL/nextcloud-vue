# board-card-sub-and-due-leading Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-card-sub-and-due-leading](../../)

## ADDED Requirements

### Requirement: A kanban card's number line and footer read at normal leading

In the board look a kanban card's number line and footer SHALL read at the font's normal line height, so a card is as tall as the board draws it.

#### Scenario: DqWerkbord

- GIVEN the card "Afgewezen parkeervergunningen 2025"
- THEN its number line is 15px tall, its footer 24px, and the card 172.5px
