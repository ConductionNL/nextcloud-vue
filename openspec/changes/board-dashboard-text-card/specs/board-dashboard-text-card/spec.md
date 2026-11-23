# board-dashboard-text-card Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-dashboard-text-card](../../)

## Purpose

A text card on a board dashboard reads as the board's text card.

## ADDED Requirements

### Requirement: A board dashboard text card sits at the card inset under its title

In the board look, a CnTextWidget inside a bordered dashboard card SHALL be padded `0 var(--cn-board-dashboard-card-inset)
20px` (over its inline 16px) and start 2px higher, so its text stands 8px under the header. Its top-level blocks SHALL
take the widget's font size at a 1.5 line height, the first without a top margin and the last without a bottom margin.
The Nextcloud look SHALL be unchanged.

#### Scenario: How end-of-day works

- GIVEN DqDagAfsluiten in the board look with the "Hoe dit werkt" text card
- WHEN the card renders
- THEN its text starts at the card's inset, about 10px under the title, at 14px
