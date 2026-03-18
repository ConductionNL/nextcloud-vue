# Data Display — Components Spec

## Purpose
Specifies the data display components: CnDataTable, CnCardGrid, CnObjectCard, CnCellRenderer, CnPagination, CnFilterBar, CnFacetSidebar, CnKpiGrid.

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

### REQ-DD-007: View Mode Toggle (via CnActionsBar)

> **Note:** The view mode toggle is not a standalone component. It is rendered inline within CnActionsBar using NcCheckboxRadioSwitch radio buttons. See REQ-LC-002 for the full specification.

---

### Current Implementation Status

**All specified components exist and are implemented:**

- **CnDataTable** — `src/components/CnDataTable/CnDataTable.vue` (349 lines). Implements sortable columns, row selection with select-all checkbox, custom cell rendering via `#column-{key}` scoped slots, loading/empty states, schema-driven columns via `columnsFromSchema()`. Props include `columns`, `rows`, `schema`, `loading`, `sortKey`, `sortOrder`, `selectable`, `selectedIds`, `excludeColumns`, `includeColumns`, `columnOverrides`, and more. Emits `@sort`, `@select`, `@row-click`.

- **CnCardGrid** — `src/components/CnCardGrid/CnCardGrid.vue`. Renders objects as CnObjectCard instances in a CSS Grid layout. Supports `#card` scoped slot for custom card rendering and `selectable` mode.

- **CnCellRenderer** — `src/components/CnCellRenderer/CnCellRenderer.vue`. Type-aware formatting: dates as locale strings, booleans as checkmarks/crosses, UUIDs truncated, enum values show labels. Uses `formatValue()` from `src/utils/schema.js`.

- **CnPagination** — `src/components/CnPagination/CnPagination.vue`. Full pagination with page numbers, first/last/prev/next buttons, page size selector. Emits `@page-changed(page)` and `@page-size-changed(size)`.

- **CnFilterBar** — `src/components/CnFilterBar/CnFilterBar.vue`. Search input with filter controls row. Emits search value to parent.

- **CnFacetSidebar** — `src/components/CnFacetSidebar/CnFacetSidebar.vue`. Faceted filter sidebar with expandable facet groups and count display. Integrates with `useListView`'s `activeFilters` and store's `facets` data.

- **CnKpiGrid** — `src/components/CnKpiGrid/CnKpiGrid.vue`. KPI metric cards in a grid layout.

**Supporting utilities:**
- `src/utils/schema.js` — `columnsFromSchema(schema, options)`, `filtersFromSchema(schema, options)`, `fieldsFromSchema(schema, options)`, `formatValue(value, format)`

**Documentation pages exist for all data display components** in `docs/components/`:
- cn-data-table.md, cn-card-grid.md, cn-cell-renderer.md, cn-pagination.md, cn-filter-bar.md, cn-facet-sidebar.md, cn-kpi-grid.md

**Additional related components not in spec:**
- CnRowActions (`src/components/CnRowActions/`) — Row action buttons used by CnDataTable
- CnMassActionBar (`src/components/CnMassActionBar/`) — Floating bar for mass actions on selected rows
- CnStatusBadge (`src/components/CnStatusBadge/`) — Color-coded status pill (mentioned in component-reference spec but not this spec)
- CnStatsBlock (`src/components/CnStatsBlock/`) — Stats display with count and breakdown

**Not yet implemented / deviations:**
- REQ-DD-007 (View Mode Toggle) correctly notes it is in CnActionsBar, not standalone — no deviation

### Standards & References

- **Vue 2 Options API** — All components follow Options API pattern
- **Nextcloud Vue** — CnDataTable wraps around Nextcloud table concepts; CnPagination and CnFilterBar compose with NcButton, NcTextField
- **Schema-driven rendering** — `columnsFromSchema()` extracts columns from OpenRegister JSON Schema `properties` definitions
- **CSS** — `cn-` prefix on all classes, Nextcloud CSS variables for theming
- **WCAG AA** — Tables include proper `<th>` headers; checkboxes for selection; pagination has clear navigation controls

### Specificity Assessment

- **Specific enough?** Yes, scenarios are concrete and testable for core behaviors.
- **Missing/ambiguous:**
  - CnDataTable's `excludeColumns`, `includeColumns`, `columnOverrides` props are mentioned but not fully specified with scenarios
  - CnCardGrid's CSS Grid configuration (column count, gap, responsive behavior) is not specified
  - CnKpiGrid's expected props and data format are not specified beyond naming
  - CnFacetSidebar's interaction with `useListView`'s `onFilterChange` is not specified
  - No specification for loading/empty states in CnDataTable (they exist in the implementation)
  - CnObjectCard's props and behavior are referenced but not specified here
- **Open questions:**
  - Should CnDataTable support inline editing in the future?
  - Should CnCardGrid support different layout modes (masonry, grid, list)?
  - Should CnKpiGrid support clickable KPI cards that navigate to filtered views?
