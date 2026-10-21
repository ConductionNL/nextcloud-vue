# board-pagination-under-card-grid Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-pagination-under-card-grid](../../)

## Purpose

The board page footer sits as the boards draw it, in a table card or under a card grid.

## ADDED Requirements

### Requirement: The page footer under a card grid is a plain row

In the board look an index page's page footer under a card grid SHALL draw with 4px 0 padding and no top hairline; in a
table card it SHALL keep 12px 16px and the hairline.

#### Scenario: DqAanMijToegewezen

- **GIVEN** dossiq's assigned-to-me queue as cards in the board look
- **THEN** "7 van 7 open zaken" and the page links sit under the cards without a hairline
