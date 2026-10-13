# index-toolbar Delta: screens-filter-menu-count

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-filter-menu-count](../../)

## Purpose

The Filter menu button says how many filters are active.

## ADDED Requirements

### Requirement: The Filter menu button counts the active filters

Under the board look, the Filter menu button of an index page with `filterMenu` SHALL show the number of active
filters as a badge after its label and in its accessible name while at least one filter is active, and SHALL show
neither while none is.

#### Scenario: Two active filters

- **GIVEN** a board index page with `filterMenu` and the filters Status and Team active
- **WHEN** the toolbar renders
- **THEN** the Filter button shows "2" in a 20px badge and is named "Filter, 2 active"

#### Scenario: No active filter

- **WHEN** no filter is active
- **THEN** the Filter button shows no badge and is named "Filter"
