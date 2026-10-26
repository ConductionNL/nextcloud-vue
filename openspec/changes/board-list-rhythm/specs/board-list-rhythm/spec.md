# board-list-rhythm Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-list-rhythm](../../)

## ADDED Requirements

### Requirement: A board list page keeps the board's vertical rhythm

In the board look an index page's header SHALL end 8px under its count line, which reads at its normal leading; the toolbar's rows SHALL stand 20px apart; the bulk band SHALL add no margin to the page's 20px gap; and a map list page SHALL keep the height of its content around a 533px map, 18px in.

#### Scenario: DqZaken

- GIVEN the case list at 1440px
- THEN the header is 76px tall, the chips stand at 189, the search field at 248, the bulk band at 308 and the table at 406

#### Scenario: DqZakenKaart

- GIVEN the case map with its list
- THEN the map is 533px tall and the pager stands at 891
