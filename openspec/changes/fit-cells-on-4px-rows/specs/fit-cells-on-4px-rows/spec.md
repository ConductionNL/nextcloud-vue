# fit-cells-on-4px-rows Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [fit-cells-on-4px-rows](../../)

## Purpose

A size-to-content dashboard cell ends close enough to its content that the cards below stand where the boards draw them.

## ADDED Requirements

### Requirement: A size-to-content cell ends within 4px of its content

On a view-mode packing grid with a size-to-content cell, `CnDashboardGrid` SHALL draw each layout row as 20 GridStack
rows (4px at the default 80px cell height). Fixed cells SHALL keep their pixel size and place, and edit mode and
`layout-change` SHALL stay in layout rows.

#### Scenario: DqDashboard chart row

- **GIVEN** the dashboard with the two chart cards sized to their content (247.6px)
- **THEN** each takes 272px of grid height and the cards under them start 20px under the chart cards, not 32
