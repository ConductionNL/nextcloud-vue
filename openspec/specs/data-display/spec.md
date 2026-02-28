# Data Display — Components Spec

## Purpose
Specifies the data display components: CnDataTable, CnCardGrid, CnObjectCard, CnCellRenderer, CnPagination, CnFilterBar, CnFacetSidebar, CnKpiGrid, CnViewModeToggle.

---

## Requirements

### REQ-DD-001: CnDataTable — Sortable Data Table

The table MUST support manual and schema-driven column definitions, sorting, row selection, and custom cell rendering.

#### Scenario: Schema-driven columns

- GIVEN a schema with properties `title`, `status`, `created`
- WHEN CnDataTable receives `:schema="schema"`
- THEN columns MUST be auto-generated via `columnsFromSchema()`
- AND column labels MUST come from `prop.title` or humanized key
- AND columns MUST respect `excludeColumns`, `includeColumns`, `columnOverrides`

#### Scenario: Sorting

- GIVEN a table with sortable columns
- WHEN the user clicks a column header
- THEN the table MUST emit `@sort({ key, order })` cycling asc → desc → null
- AND a sort indicator arrow MUST appear on the active column

#### Scenario: Row selection

- GIVEN `selectable` is true
- WHEN the user checks a row checkbox
- THEN `@select(ids)` MUST emit with the updated selection
- AND a "select all" checkbox MUST select/deselect all visible rows

#### Scenario: Custom cell rendering

- GIVEN a column `status`
- WHEN the parent provides a `#column-status` slot
- THEN the slot MUST receive `{ row, value }` scope
- AND the custom slot content MUST render instead of CnCellRenderer

### REQ-DD-002: CnCardGrid — Object Card Grid

#### Scenario: Card rendering

- GIVEN an array of objects
- WHEN CnCardGrid renders
- THEN each object MUST render as a CnObjectCard (or custom `#card` slot)
- AND the grid MUST use CSS Grid layout
- AND cards MUST be selectable when `selectable` is true

### REQ-DD-003: CnCellRenderer — Type-Aware Formatting

#### Scenario: Format-based rendering

- GIVEN a cell value and a schema property definition
- WHEN CnCellRenderer renders
- THEN dates MUST be formatted as locale strings
- AND booleans MUST show as checkmarks/crosses
- AND UUIDs MUST be truncated
- AND enum values MUST show their label

### REQ-DD-004: CnPagination — Full Pagination Controls

#### Scenario: Page navigation

- GIVEN 100 items with 20 per page
- WHEN the user clicks page 3
- THEN `@page-changed(3)` MUST emit
- AND the current page button MUST be highlighted
- AND first/last/prev/next buttons MUST be present

#### Scenario: Page size

- WHEN the user changes page size to 50
- THEN `@page-size-changed(50)` MUST emit

### REQ-DD-005: CnFilterBar — Search and Filter Controls

#### Scenario: Search input

- GIVEN a filter bar with search
- WHEN the user types a search term
- THEN the parent MUST receive the search value via event/v-model

### REQ-DD-006: CnFacetSidebar — Faceted Filters

#### Scenario: Facet display

- GIVEN facets `{ status: { values: [{ value: 'active', count: 5 }] } }`
- WHEN CnFacetSidebar renders
- THEN each facet group MUST be expandable
- AND each value MUST show its count

### REQ-DD-007: CnViewModeToggle (Deprecated — Inline in CnActionsBar)

> **Note:** The view mode toggle is no longer a standalone component. It is rendered inline within CnActionsBar using NcCheckboxRadioSwitch radio buttons. See REQ-LC-002 for the current specification.

#### Scenario: Toggle between views

- GIVEN CnActionsBar renders with `showViewToggle=true`
- WHEN the user clicks "Cards" or "Table" in the segmented radio toggle
- THEN `@view-mode-change('cards')` or `@view-mode-change('table')` MUST emit
- AND the active segment MUST reflect the current `viewMode` prop
