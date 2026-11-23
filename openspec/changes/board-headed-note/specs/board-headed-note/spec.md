# board-headed-note Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-headed-note](../../)

## Purpose

A note with a heading reads as the boards' larger note box.

## ADDED Requirements

### Requirement: A board note with a heading is the larger box

In the board look an info NcNoteCard with a heading SHALL have 14px 16px of padding, 12px between icon and text, a
20px icon and 14px text, in a board dialog as well. An info note without a heading SHALL keep the small box.

#### Scenario: DqBesluit "Publiceren doet u daarna"

- **GIVEN** the decision dialog in the board look
- **THEN** the note's heading starts 48px from its left edge, after a 20px icon, at 14px
