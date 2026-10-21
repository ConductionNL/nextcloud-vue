# board-pagination-links Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-pagination-links](../../)

## Purpose

Board page links are sized as the boards draw them.

## ADDED Requirements

### Requirement: A board page link is sized as the boards draw it

In the board look a page link SHALL be 36px high and at least 36px wide with its 1px border; the current page SHALL be
34px high and at least 34px wide without a border.

#### Scenario: DqZaken

- **GIVEN** dossiq's case list in the board look, on page 1 of 3
- **THEN** "2", "3" and "Volgende" draw 36px high, and the current "1" 34px
