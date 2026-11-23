# week-strip-board-look Delta: board-week-strip-fits

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-week-strip-fits](../../)

## Purpose

A week strip under the board look fits its card instead of scrolling sideways.

## ADDED Requirements

### Requirement: A board week strip fits its card

Under the board look a week strip SHALL NOT scroll sideways. Its days SHALL be at least 120px wide and fill the card in equal columns, and the days that do not fit a row SHALL wrap to the next row. In a card that held the days before, each day SHALL be as wide as before. Without the board look the strip SHALL be unchanged.

#### Scenario: Termijnen deze week at 1100 wide

- **GIVEN** a five-day week strip in a 494px card under the board look
- **WHEN** it is shown
- **THEN** the days sit in two rows, three and two, inside the card, and nothing scrolls

#### Scenario: A wide card

- **GIVEN** the same strip in a 700px card
- **WHEN** it is shown
- **THEN** each day is 132px wide, as before

#### Scenario: Without the board look

- **GIVEN** the same strip in a 494px card without the board look
- **WHEN** it is shown
- **THEN** the strip scrolls sideways, as before
