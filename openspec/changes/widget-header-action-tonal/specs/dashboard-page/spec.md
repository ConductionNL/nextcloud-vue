# dashboard-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [widget-header-action-tonal](../../)

## ADDED Requirements

### Requirement: A KPI row can have a fixed number of columns

A dashboard's `config.kpiColumns` SHALL set the columns of its KPI row at full width to 2, 3 or 4; without it the row
stays an auto-fit grid of 200px columns.

#### Scenario: PqLoyaliteit eight tiles

- **GIVEN** a `kpiRow` of eight tiles and `kpiColumns: 4`
- **THEN** the tiles sit in two rows of four
