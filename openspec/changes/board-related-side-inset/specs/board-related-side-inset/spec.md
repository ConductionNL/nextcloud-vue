# board-related-side-inset Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-related-side-inset](../../)

## Purpose

A related-objects card in a board-look side column lines its rows up with its title.

## ADDED Requirements

### Requirement: A related side card puts its rows on the card's inset

In the board look, the rows, group titles, status lines, link rows and "show all" of a related-objects card in a detail
page's side column SHALL start 22px in from the card's inner edge, as its title does.

#### Scenario: PqTicket "Gerelateerd"

- **WHEN** a user opens a request whose side column holds the related card
- **THEN** its first row's text starts 23px in from the card's outer edge, under the title
