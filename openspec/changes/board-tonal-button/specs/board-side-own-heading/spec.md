# board-side-own-heading Delta: board-tonal-button

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-tonal-button](../../)

## Purpose

Let a side card whose widget draws its own heading read like every other side card.

## ADDED Requirements

### Requirement: A side card's own heading reads as the side card title

In a board-look side column, a timeline widget's title and a heading carrying `cn-side-heading` SHALL be drawn as the
side card title: 15px, weight 600, normal line height, the muted text colour, without a margin.

#### Scenario: The history card on a campaign

- **GIVEN** a campaign page with the timeline History in its side column
- **WHEN** the page is drawn in the board look
- **THEN** History reads 15px, weight 600, in the muted text colour
