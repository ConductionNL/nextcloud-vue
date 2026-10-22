# dashboard-side-column-width Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-side-column-width](../../)

## Purpose

A dashboard's side column can keep the width the board draws.

## ADDED Requirements

### Requirement: A dashboard can draw its side column at a fixed width

With `gridSideColumn: { width, from? }` on the page or on the open view, the dashboard grid SHALL draw every item from
column `from` (default 8) on at `width` px plus its item margins, and the columns before it SHALL share the remaining
width; an item across the split SHALL span both. It SHALL apply only on the full twelve-column grid and not while the
layout is edited. A page or view without it SHALL keep twelve equal columns.

#### Scenario: DqMijnWerk

- **GIVEN** the My work view with `gridSideColumn: { width: 320 }` on a 1144px grid with 12px item margins
- **THEN** a card at columns 8 to 12 is 320px wide and a card at columns 0 to 8 is 776px wide

#### Scenario: DqMijnTeam

- **GIVEN** the My team view of the same page without `gridSideColumn`
- **THEN** its two half-width cards stay half the width each
