# board-pagination-weight Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-pagination-weight](../../)

## Purpose

The board footer's page links have the weight the boards draw.

## ADDED Requirements

### Requirement: Board page links are regular weight

In the board look the footer's page links and its next link SHALL be set at weight 400; the current page SHALL stay
at 600.

#### Scenario: DqZaken footer

- **GIVEN** a paged index table in the board look
- **THEN** "2", "3" and "Volgende" are weight 400 and the current page "1" is 600
