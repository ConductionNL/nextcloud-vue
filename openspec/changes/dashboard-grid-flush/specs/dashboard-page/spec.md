# dashboard-page Delta: dashboard-grid-flush

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-grid-flush](../../)

## Purpose

Line the board dashboard's cards up with its KPI row and header.

## ADDED Requirements

### Requirement: Board cards line up with the page edge

Under the board look CnDashboardPage SHALL offset its grid by the grid margin on both inline sides, so the left edge of
the leftmost card equals the left edge of the KPI row and the right edge of the rightmost card equals its right edge,
at desktop and phone widths. Without the board look the grid SHALL keep its position.

#### Scenario: Desktop

- **GIVEN** the board look, a KPI row and two side-by-side cards at 1280px
- **WHEN** the page renders
- **THEN** the first card starts at the KPI row's left edge and the last ends at its right edge
