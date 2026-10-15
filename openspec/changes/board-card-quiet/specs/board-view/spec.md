# board-view Delta: board-card-quiet

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-card-quiet](../../)

## Purpose

A board card reads as the board draws it, whatever the theme does to links.

## ADDED Requirements

### Requirement: A board card reads as the board draws it

Under the board look a card's title SHALL be drawn in the main text colour without an underline, also under a theme that colours and underlines links with `!important`. The card's selection checkbox SHALL take no space and be transparent unless the card is hovered, holds focus, or the board holds a selection, and SHALL stay reachable with Tab. On a device without hover the checkbox SHALL always show.

#### Scenario: Werkbord under thematiq

- **GIVEN** a board look board under a theme with `a { color; text-decoration: underline } !important`
- **THEN** each card title is in the main text colour without an underline
- **AND** no checkbox shows on a card the pointer is not over

#### Scenario: Selecting with the keyboard

- **GIVEN** the same board
- **WHEN** the reader tabs to a card's checkbox and presses Space
- **THEN** that checkbox shows while it holds focus, and once the card is selected every card shows its checkbox
