# board-case-widget-card Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-case-widget-card](../../)

## ADDED Requirements

### Requirement: A case widget card is a board card

In the board look a card drawn by CnConversationWidget or CnDocumentReviewWidget SHALL take the board card radius and
padding, SHALL keep its top-left square as the first card of a tab stack, and a conversation's title SHALL take the
board heading size at a 1.2 line height.

#### Scenario: DqZaakContact

- **GIVEN** a case in the board look, on its Contact tab
- **THEN** "Gesprek met de inwoner" joins the open tab with a square top-left corner
- **AND** its title is 17px
