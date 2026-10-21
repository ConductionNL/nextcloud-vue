# board-grouped-cards Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-grouped-cards](../../)

## Purpose

The grouped cards widget draws its groups and cards as the boards do.

## ADDED Requirements

### Requirement: Board grouped cards take the board's group and card shape

In the board look CnGroupedCardsWidget SHALL set its groups 14px apart, pad a group 14px with a 10px radius and a
bold title, and pad a card 9px 12px with the 8px control radius and a 15px title. Outside the board look the widget
SHALL keep its own shape.

#### Scenario: DqZaaktype "Fasen en taken"

- **GIVEN** a case type's phases and tasks as grouped cards in the board look
- **THEN** "Fase 1: Ontvangst" is a 10px-rounded group padded 14px with a bold title, and "Volledigheid toetsen" a card padded 9px 12px with an 8px radius
