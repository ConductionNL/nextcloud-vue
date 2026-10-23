# board-stat-grid-flat Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-stat-grid-flat](../../)

## Purpose

The figures of a stat grid card read as the board's plain figures.

## ADDED Requirements

### Requirement: A board stat grid draws flat figures at the card inset

In the board look, a CnStatGridWidget in a bordered dashboard card SHALL be padded `0 var(--cn-board-dashboard-card-inset)
20px` with a 4px top margin and a 16px gap. Its stacked stat cells SHALL have no padding and no border, a 2px gap, a 13px
label and a 24px figure. The Nextcloud look SHALL be unchanged.

#### Scenario: Your day

- GIVEN DqDagAfsluiten in the board look with the "Uw dag" card
- WHEN the card renders
- THEN the first label stands 14px under the title at the card's inset
- AND the cells are plain figures 16px apart
