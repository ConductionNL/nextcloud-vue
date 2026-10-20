# board-detail-header-row Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-detail-header-row](../../)

## Purpose

A detail page's header buttons sit where the board puts them.

## ADDED Requirements

### Requirement: The board detail header keeps its actions on the title row

In the board look a detail page's header SHALL align its row to the top, and the title block SHALL take the width the
header buttons leave, from a zero basis down to 16rem, so the buttons stay on the title row, level with the title,
until less than 16rem of title fits beside them.

#### Scenario: DqZaak at a 1280px window

- **GIVEN** a case detail page in the board look with four header buttons and a follow control
- **THEN** the buttons sit on the title row, at the title's top
