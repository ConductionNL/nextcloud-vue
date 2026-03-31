---
status: implemented
---

# Data Display — Components Spec

## Purpose
Specifies the data display components: CnDataTable, CnCardGrid, CnObjectCard, CnCellRenderer, CnStatusBadge, CnPagination, CnFilterBar, CnFacetSidebar, CnKpiGrid.

**Files:**
- `src/components/CnDataTable/CnDataTable.vue`
- `src/components/CnCardGrid/CnCardGrid.vue`
- `src/components/CnObjectCard/CnObjectCard.vue`
- `src/components/CnCellRenderer/CnCellRenderer.vue`
- `src/components/CnStatusBadge/CnStatusBadge.vue`
- `src/components/CnPagination/CnPagination.vue`
- `src/components/CnFilterBar/CnFilterBar.vue`
- `src/components/CnFacetSidebar/CnFacetSidebar.vue`
- `src/components/CnKpiGrid/CnKpiGrid.vue`
- `src/utils/schema.js` (supporting utilities: `columnsFromSchema`, `formatValue`, `filtersFromSchema`)

**Cross-references:** index-page (REQ-IP-002 dual view mode), schema-utilities (REQ-SU-001 columnsFromSchema, REQ-SU-002 formatValue), composables (useListView sort/filter/pagination state)

---

## Requirements

### REQ-DD-001: CnDataTable — Schema-Driven and Manual Columns

CnDataTable MUST support both manual column definitions via the `columns` prop and auto-generated columns via the `schema` prop. When both are absent, the table MUST render no data columns.

#### Scenario: Schema-driven column generation

- GIVEN a schema with `properties` containing `title` (string), `status` (string, enum: ['open','closed']), `created` (string, format: date-time)
- WHEN CnDataTable receives `:schema="schema"` and `columns` is empty (default)
- THEN `effectiveColumns` MUST be computed via `columnsFromSchema(schema, { exclude, include, overrides })`
- AND column `label` MUST come from `prop.title` or the raw property key
- AND columns MUST be sorted by `prop.order` (ascending), then alphabetically
- AND properties with `visible: false` or `type: 'object'` MUST be excluded

#### Scenario: Manual column definitions

- GIVEN `columns` is `[{ key: 'name', label: 'Name', sortable: true, width: '200px' }, { key: 'email', label: 'Email' }]`
- AND `schema` is null
- WHEN CnDataTable renders
- THEN `effectiveColumns` MUST use the manual `columns` array directly
- AND each column object MAY include `key`, `label`, `sortable`, `width`, `class`, `cellClass`

#### Scenario: Schema with excludeColumns and includeColumns

- GIVEN a schema with properties `id`, `title`, `description`, `status`, `created`
- AND `excludeColumns` is `['description']`
- WHEN CnDataTable renders
- THEN the `description` column MUST NOT appear
- AND all other visible properties MUST appear

#### Scenario: Schema with columnOverrides

- GIVEN a schema with property `status`
- AND `columnOverrides` is `{ status: { width: '200px', label: 'Current Status' } }`
- WHEN CnDataTable renders
- THEN the `status` column width MUST be `200px`
- AND the column label MUST be `Current Status` (overriding `prop.title`)

#### Scenario: Dot-notation nested values

- GIVEN a column with `key: 'address.city'`
- AND a row with `{ address: { city: 'Amsterdam' } }`
- WHEN `getCellValue(row, 'address.city')` is called
- THEN the return value MUST be `'Amsterdam'`

### REQ-DD-002: CnDataTable — Sorting

The table MUST support column sorting with visual indicators and event emission.

#### Scenario: Clicking a sortable column header

- GIVEN a table with `effectiveColumns` containing `{ key: 'title', sortable: true }`
- AND `sortKey` is null
- WHEN the user clicks the `title` column header
- THEN `@sort` MUST emit with `{ key: 'title', order: 'asc' }`

#### Scenario: Cycling sort order on repeated clicks

- GIVEN `sortKey` is `'title'` and `sortOrder` is `'asc'`
- WHEN the user clicks the `title` column header again
- THEN `@sort` MUST emit with `{ key: 'title', order: 'desc' }`

#### Scenario: Sort indicator display

- GIVEN `sortKey` is `'title'` and `sortOrder` is `'asc'`
- WHEN the table header renders
- THEN the `title` column header MUST show a `cn-table-sort-indicator` span containing `▲`
- AND when `sortOrder` is `'desc'`, the indicator MUST show `▼`
- AND columns where `sortKey` does not match MUST NOT show an indicator

#### Scenario: Non-sortable columns ignore clicks

- GIVEN a column with `sortable: false` (or `sortable` not set in manual mode)
- WHEN the user clicks that column header
- THEN no `@sort` event MUST be emitted

### REQ-DD-003: CnDataTable — Row Selection

The table MUST support row-level and select-all selection when `selectable` is true.

#### Scenario: Individual row selection

- GIVEN `selectable` is `true` and `selectedIds` is `[]`
- WHEN the user checks the checkbox on a row with `id: '42'`
- THEN `@select` MUST emit with `['42']`
- AND the checkbox click MUST stop event propagation (no `@row-click`)

#### Scenario: Deselecting a row

- GIVEN `selectedIds` is `['42', '99']`
- WHEN the user unchecks the checkbox on row `id: '42'`
- THEN `@select` MUST emit with `['99']`

#### Scenario: Select-all checkbox

- GIVEN 3 rows with IDs `['1', '2', '3']` and `selectedIds` is `[]`
- WHEN the user clicks the select-all checkbox in the table header
- THEN `@select` MUST emit with `['1', '2', '3']`
- AND `@select-all` MUST emit with `true`

#### Scenario: Deselect-all

- GIVEN all rows are selected (`allSelected` is true)
- WHEN the user clicks the select-all checkbox
- THEN `@select` MUST emit with `[]`
- AND `@select-all` MUST emit with `false`

#### Scenario: Indeterminate state

- GIVEN 3 rows and `selectedIds` contains only `['1']`
- THEN the select-all checkbox MUST render with `indeterminate: true`
- AND `allSelected` computed MUST be `false`
- AND `someSelected` computed MUST be `true`

### REQ-DD-004: CnDataTable — Loading and Empty States

CnDataTable MUST display appropriate loading and empty states based on the `loading` and `rows` props.

#### Scenario: Loading state

- GIVEN `loading` is `true`
- WHEN CnDataTable renders
- THEN a `cn-table-loading` container MUST be shown with `NcLoadingIcon` (size 32)
- AND the `loadingText` prop value MUST be displayed (default: `'Loading...'`)
- AND the `<table>` element MUST NOT render

#### Scenario: Empty state

- GIVEN `loading` is `false` and `rows` is `[]`
- WHEN CnDataTable renders
- THEN a single `<tr class="cn-table-empty">` MUST render
- AND its `<td>` MUST span all columns (`colspan` = `totalColumns`)
- AND the `emptyText` prop value MUST be displayed (default: `'No items found'`)

#### Scenario: Custom empty state via slot

- GIVEN `rows` is `[]`
- WHEN the parent provides a `#empty` slot
- THEN the slot content MUST render instead of the default `emptyText`

### REQ-DD-005: CnDataTable — Custom Cell Rendering and Row Actions

CnDataTable MUST support custom cell rendering via scoped slots and a dedicated row actions column.

#### Scenario: Scoped slot override for a column

- GIVEN a column with `key: 'status'`
- WHEN the parent provides a `#column-status` scoped slot
- THEN the slot MUST receive `{ row, value }` scope
- AND the slot content MUST render instead of the default CnCellRenderer or plain text
- AND CnCellRenderer MUST NOT render for that column

#### Scenario: Schema-driven cell rendering fallback

- GIVEN a schema-generated column (has `type` property from `columnsFromSchema`)
- AND no scoped slot `#column-{key}` is provided
- WHEN the cell renders
- THEN `CnCellRenderer` MUST render with `:value="getCellValue(row, col.key)"` and `:property="getSchemaProperty(col.key)"`

#### Scenario: Row actions column

- GIVEN the parent provides a `#row-actions` scoped slot
- WHEN the table renders
- THEN an additional `<th>` with class `cn-table-col--actions` MUST appear in the header
- AND each row MUST have a `<td class="cn-table-col--actions">` with the slot content
- AND clicks on the actions cell MUST stop propagation (no `@row-click`)
- AND `totalColumns` MUST include the actions column

#### Scenario: Row click event

- GIVEN a data row
- WHEN the user clicks the row (outside checkbox and actions cells)
- THEN `@row-click` MUST emit with the full row object

#### Scenario: Row class function

- GIVEN `rowClass` is `(row) => row.priority === 'high' ? 'cn-table-row--urgent' : ''`
- WHEN each row renders
- THEN the `<tr>` MUST include the class returned by the `rowClass` function
- AND selected rows MUST also have `cn-table-row--selected`

### REQ-DD-006: CnCardGrid — Responsive Object Card Grid

CnCardGrid MUST render objects as CnObjectCard instances in a responsive CSS Grid layout.

#### Scenario: Grid layout

- GIVEN an array of objects
- WHEN CnCardGrid renders
- THEN `cn-card-grid__grid` MUST use `display: grid` with `grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))`
- AND cards MUST be separated by a `16px` gap

#### Scenario: Loading state

- GIVEN `loading` is `true`
- WHEN CnCardGrid renders
- THEN a `cn-card-grid__loading` container MUST show `NcLoadingIcon` (size 32)
- AND no cards MUST render

#### Scenario: Empty state

- GIVEN `objects` is `[]` and `loading` is `false`
- WHEN CnCardGrid renders
- THEN `NcEmptyContent` MUST display with the `emptyText` prop (default: `'No items found'`)
- AND a `ViewGrid` icon (size 64) MUST render in the `#icon` slot

#### Scenario: Custom empty state via slot

- GIVEN `objects` is `[]`
- WHEN the parent provides a `#empty` slot
- THEN the slot content MUST replace the default `NcEmptyContent`

#### Scenario: Custom card rendering via slot

- GIVEN the parent provides a `#card` scoped slot
- WHEN CnCardGrid renders each object
- THEN the slot MUST receive `{ object, selected, schema }` scope
- AND the slot content MUST render instead of the default CnObjectCard

#### Scenario: Card selection

- GIVEN `selectable` is `true` and `selectedIds` is `['42']`
- WHEN the user selects a card with `id: '99'`
- THEN `@select` MUST emit with `['42', '99']`

#### Scenario: Card action and badge slots

- GIVEN the parent provides `#card-actions` and/or `#card-badges` scoped slots
- WHEN CnCardGrid renders CnObjectCards
- THEN those slots MUST be forwarded to each CnObjectCard's `#actions` and `#badges` slots
- AND each slot MUST receive `{ object }` scope

### REQ-DD-007: CnObjectCard — Schema-Configuration-Driven Card

CnObjectCard MUST render an object as a card using `schema.configuration` to determine layout.

#### Scenario: Title resolution

- GIVEN `schema.configuration.objectNameField` is `'fullName'`
- AND the object has `{ fullName: 'Jan de Vries' }`
- WHEN CnObjectCard renders
- THEN `cn-object-card__title` MUST show `'Jan de Vries'`

#### Scenario: Title fallback chain

- GIVEN `schema.configuration.objectNameField` is not set (or the field is empty)
- WHEN CnObjectCard renders
- THEN the title MUST fall back to `object.title`, then `object.name`, then `object.id`, then `'--'`

#### Scenario: Description with truncation

- GIVEN `schema.configuration.objectDescriptionField` is `'summary'`
- AND `object.summary` is a 150-character string
- WHEN CnObjectCard renders
- THEN `cn-object-card__description` MUST show the first 120 characters followed by `'...'`

#### Scenario: Image display

- GIVEN `schema.configuration.objectImageField` is `'logo'`
- AND `object.logo` is a URL
- WHEN CnObjectCard renders
- THEN an `<img>` with class `cn-object-card__image` MUST render with `src` set to the URL
- AND `alt` MUST be set to the card title
- AND the image MUST be `48px x 48px` with `object-fit: cover`

#### Scenario: Metadata fields from schema properties

- GIVEN a schema with 8 properties, where 3 are config fields (name, description, image) and 1 has `visible: false`
- AND `maxMetadata` is `4` (default)
- WHEN CnObjectCard computes `metadataFields`
- THEN at most 4 properties MUST appear in the metadata section
- AND config fields (objectNameField, objectDescriptionField, objectSummaryField, objectImageField) MUST be excluded
- AND properties with `type: 'object'` or `format: 'markdown'` MUST be excluded
- AND fields MUST be sorted by `prop.order`
- AND each field MUST render as a label (from `prop.title`) with a CnCellRenderer value

#### Scenario: Card selection and click

- GIVEN `selectable` is `true`
- WHEN the user clicks the card body
- THEN `@click` MUST emit with the object
- AND when the user clicks the checkbox
- THEN `@select` MUST emit with the object (click MUST stop propagation)

### REQ-DD-008: CnCellRenderer — Type-Aware Cell Formatting

CnCellRenderer MUST render cell values differently based on the schema property definition.

#### Scenario: Boolean rendering

- GIVEN `property.type` is `'boolean'` and `value` is `true`
- WHEN CnCellRenderer renders
- THEN a `CheckBold` icon (size 16) MUST render with class `cn-cell-renderer__icon--success` (green via `var(--color-success)`)
- AND when `value` is `false` or null, a dash `'--'` MUST render

#### Scenario: Enum rendering as status badge

- GIVEN `property.enum` is `['open', 'closed', 'pending']` and `value` is `'open'`
- WHEN CnCellRenderer renders
- THEN a `CnStatusBadge` MUST render with `label="open"`
- AND when `value` is null or empty, a dash MUST render

#### Scenario: Array rendering

- GIVEN `property.type` is `'array'` and `value` is `['tag1', 'tag2', 'tag3', 'tag4']`
- WHEN CnCellRenderer renders
- THEN `formatValue` MUST return `'tag1, tag2, tag3 +1'` (first 3 items joined, remainder counted)
- AND the `title` attribute MUST contain the full comma-joined list

#### Scenario: Date-time formatting

- GIVEN `property.format` is `'date-time'` and `value` is `'2025-01-15T14:30:00Z'`
- WHEN `formatValue` processes the value
- THEN it MUST return a locale-formatted string like `'15/01/2025, 14:30:00'`
- AND the cell MUST have class `cn-cell-renderer--date` with `white-space: nowrap`

#### Scenario: UUID truncation

- GIVEN `property.format` is `'uuid'` and `value` is `'550e8400-e29b-41d4-a716-446655440000'`
- WHEN `formatValue` processes the value
- THEN it MUST return `'550e8400...'` (first 8 characters plus ellipsis)
- AND the cell MUST have class `cn-cell-renderer--uuid` with monospace font

#### Scenario: URL formatting

- GIVEN `property.format` is `'uri'` and `value` is `'https://example.com/path/to/resource?query=1'`
- WHEN `formatValue` processes the value
- THEN it MUST return a truncated form like `'example.com/path/to/resource'` (hostname + first 20 chars of path)

#### Scenario: Email formatting

- GIVEN `property.format` is `'email'` and `value` is `'user@example.com'`
- WHEN `formatValue` processes the value
- THEN it MUST return the email as-is without truncation

#### Scenario: Number formatting

- GIVEN `property.type` is `'integer'` and `value` is `1500000`
- WHEN `formatValue` processes the value
- THEN it MUST return `'1,500,000'` (locale-formatted with separators)
- AND the cell MUST have class `cn-cell-renderer--number` with `font-variant-numeric: tabular-nums`

#### Scenario: Null/empty fallback

- GIVEN `value` is `null`, `undefined`, or `''`
- WHEN `formatValue` processes the value
- THEN it MUST return `'--'` (em-dash)

#### Scenario: String truncation with hover

- GIVEN `value` is a string longer than `truncate` (default 100) characters
- WHEN CnCellRenderer renders
- THEN the displayed text MUST be truncated with `'...'`
- AND the `title` attribute MUST contain the full original string for hover tooltip

#### Scenario: Object type fallback

- GIVEN `property.type` is `'object'` (or value is a non-array object)
- WHEN `formatValue` processes the value
- THEN it MUST return `'[Object]'`

### REQ-DD-009: CnStatusBadge — Color-Coded Status Pill

CnStatusBadge MUST render a color-coded pill badge for status, priority, or category display.

#### Scenario: Explicit variant

- GIVEN `label` is `'Active'` and `variant` is `'success'`
- WHEN CnStatusBadge renders
- THEN the `<span>` MUST have classes `cn-status-badge` and `cn-status-badge--success`
- AND the text content MUST be `'Active'`

#### Scenario: Supported variants

- GIVEN `variant` prop
- WHEN any value is provided
- THEN only `'default'`, `'primary'`, `'success'`, `'warning'`, `'error'`, `'info'` MUST be accepted (validator enforced)

#### Scenario: Color map auto-resolution

- GIVEN `colorMap` is `{ open: 'success', closed: 'default', overdue: 'error' }` and `label` is `'Overdue'`
- WHEN CnStatusBadge renders
- THEN `resolvedVariant` MUST be `'error'` (case-insensitive lookup: `'overdue'.toLowerCase()`)
- AND the badge MUST have class `cn-status-badge--error`

#### Scenario: Color map fallback to variant prop

- GIVEN `colorMap` is `{ open: 'success' }` and `label` is `'Unknown'` and `variant` is `'warning'`
- WHEN CnStatusBadge renders
- THEN `resolvedVariant` MUST fall back to `'warning'` (from variant prop)

#### Scenario: Size variants

- GIVEN `size` is `'small'`
- WHEN CnStatusBadge renders
- THEN the badge MUST have class `cn-status-badge--small`
- AND `size` prop MUST only accept `'small'` or `'medium'` (validator enforced)

#### Scenario: Slot content override

- GIVEN a `<CnStatusBadge label="Draft"><NcIcon :inline="true" /> Draft</CnStatusBadge>` usage
- WHEN CnStatusBadge renders
- THEN the default slot content MUST render instead of the `label` text

### REQ-DD-010: CnPagination — Full Pagination Controls

CnPagination MUST provide page navigation, page info display, and page size selection.

#### Scenario: Page navigation buttons

- GIVEN `currentPage` is `3` and `totalPages` is `10`
- WHEN CnPagination renders
- THEN four navigation buttons MUST appear: First (`firstLabel`), Previous (`previousLabel`), Next (`nextLabel`), Last (`lastLabel`)
- AND First and Previous MUST be enabled (current page > 1)
- AND Next and Last MUST be enabled (current page < totalPages)

#### Scenario: First/Last page disabling

- GIVEN `currentPage` is `1` and `totalPages` is `5`
- WHEN CnPagination renders
- THEN First and Previous buttons MUST be `disabled`
- AND Next and Last buttons MUST be enabled

#### Scenario: Clicking a page number

- GIVEN `currentPage` is `2`
- WHEN the user clicks page button `5`
- THEN `@page-changed` MUST emit with `5`
- AND clicking the already-active page button MUST NOT emit (same page guard)

#### Scenario: Ellipsis for large page counts

- GIVEN `totalPages` is `20` and `currentPage` is `10`
- WHEN `visiblePages` computed runs
- THEN it MUST return `[1, '...', 9, 10, 11, '...', 20]` (at most 7 entries)
- AND page `1` and page `20` MUST always appear
- AND `'...'` MUST render as a `<span class="cn-pagination__ellipsis">` (not clickable)

#### Scenario: Small page count (no ellipsis)

- GIVEN `totalPages` is `5`
- WHEN `visiblePages` computed runs
- THEN it MUST return `[1, 2, 3, 4, 5]` (all pages, no ellipsis)

#### Scenario: Active page highlighting

- GIVEN `currentPage` is `3`
- WHEN CnPagination renders page buttons
- THEN page `3` button MUST have `type="primary"` and `disabled` (NcButton styling)
- AND all other page buttons MUST have `type="secondary"`

#### Scenario: Page size selector

- GIVEN `currentPageSize` is `20`
- WHEN the user selects `50` from the page size dropdown
- THEN `@page-size-changed` MUST emit with `50`
- AND the dropdown MUST show options: 10, 20, 50, 100, 250, 500, 1000 (default `pageSizeOptions`)

#### Scenario: Page info text

- GIVEN `currentPage` is `3`, `totalPages` is `10`, and `pageInfoFormat` is `'Page {current} of {total}'`
- WHEN CnPagination renders
- THEN `cn-pagination__page-info` MUST display `'Page 3 of 10'`

#### Scenario: Visibility threshold

- GIVEN `totalPages` is `1` and `totalItems` is `5` and `minItemsToShow` is `10`
- WHEN CnPagination evaluates its root `v-if`
- THEN the entire pagination component MUST NOT render (hidden)

### REQ-DD-011: CnFilterBar — Search and Filter Controls

CnFilterBar MUST provide a search input and configurable filter controls.

#### Scenario: Search input with trailing clear button

- GIVEN `searchValue` is `''` and `searchPlaceholder` is `'Search clients...'`
- WHEN CnFilterBar renders
- THEN an `NcTextField` MUST render with the placeholder text and a `Magnify` icon
- AND the trailing clear button MUST be hidden when `searchValue` is empty
- AND when the user types, `@search` MUST emit with the new value

#### Scenario: Select filter

- GIVEN `filters` contains `{ key: 'type', label: 'All types', type: 'select', options: [...], value: null }`
- WHEN CnFilterBar renders
- THEN an `NcSelect` MUST render with the label as placeholder, clearable
- AND when the user selects an option, `@filter-change` MUST emit with `{ key: 'type', value: selectedOption }`

#### Scenario: Checkbox filter

- GIVEN `filters` contains `{ key: 'active', label: 'Active only', type: 'checkbox', value: false }`
- WHEN CnFilterBar renders
- THEN an `NcCheckboxRadioSwitch` MUST render with the label text
- AND toggling MUST emit `@filter-change` with `{ key: 'active', value: true }`

#### Scenario: Clear all button

- GIVEN `showClearAll` is `true` and at least one filter has a non-empty value (or searchValue is non-empty)
- WHEN CnFilterBar renders
- THEN a clear all button MUST appear with text from `clearAllLabel` (default: `'Clear filters'`)
- AND clicking it MUST emit `@clear-all`
- AND when no filters are active, the button MUST be hidden

### REQ-DD-012: CnFacetSidebar — Schema-Driven Faceted Filters

CnFacetSidebar MUST auto-generate filter groups from schema properties marked `facetable: true`.

#### Scenario: Auto-generation from schema

- GIVEN a schema where `status` has `facetable: true` and `type: 'string'`, `enum: ['open','closed']`
- WHEN CnFacetSidebar renders
- THEN `filtersFromSchema(schema)` MUST produce a filter with `type: 'select'` and `options` from the enum
- AND the filter MUST render as a multi-select `NcSelect` with clearable and multiple

#### Scenario: Live facet data with counts

- GIVEN `facetData` is `{ status: { values: [{ value: 'open', count: 12 }, { value: 'closed', count: 5 }] } }`
- WHEN CnFacetSidebar renders the `status` filter
- THEN options MUST show `'open (12)'` and `'closed (5)'` as labels
- AND facet data MUST take priority over static enum options

#### Scenario: Boolean facet as checkbox

- GIVEN a schema property `archived` with `type: 'boolean'` and `facetable: true`
- WHEN CnFacetSidebar renders
- THEN the filter MUST render as an `NcCheckboxRadioSwitch`

#### Scenario: Clear all filters

- GIVEN `activeFilters` has non-empty values
- WHEN the user clicks the clear button (labeled from `clearLabel`, default: `'Clear all'`)
- THEN `@clear-all` MUST emit
- AND the clear button MUST only appear when `hasActiveFilters` is true

#### Scenario: Loading state

- GIVEN `loading` is `true`
- WHEN CnFacetSidebar renders
- THEN `NcLoadingIcon` MUST display and filter groups MUST NOT render

### REQ-DD-013: CnKpiGrid — Responsive KPI Metric Grid

CnKpiGrid MUST provide a responsive CSS Grid layout for KPI/stats cards.

#### Scenario: Default 4-column layout

- GIVEN `columns` is `4` (default)
- WHEN CnKpiGrid renders
- THEN the grid MUST use `grid-template-columns: repeat(4, 1fr)` with `16px` gap

#### Scenario: Responsive breakpoints

- GIVEN `columns` is `4`
- WHEN the viewport width is below 1200px
- THEN the grid MUST collapse to 2 columns
- AND below 600px, ALL column configurations (2, 3, 4) MUST collapse to 1 column

#### Scenario: Column count validation

- GIVEN the `columns` prop
- WHEN a value is provided
- THEN only `2`, `3`, or `4` MUST be accepted (validator enforced)

#### Scenario: Slot-based content

- GIVEN child elements (e.g., CnStatsBlock components) are placed inside CnKpiGrid
- WHEN CnKpiGrid renders
- THEN the default slot MUST render all children within the CSS Grid container

### REQ-DD-014: Accessibility — Table Semantics and ARIA

All data display components MUST meet WCAG AA accessibility requirements.

#### Scenario: Table semantic structure

- GIVEN CnDataTable renders
- THEN it MUST use proper `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` elements
- AND column headers MUST be in `<th>` elements within `<thead>`
- AND data cells MUST be in `<td>` elements within `<tbody>`

#### Scenario: Selection checkbox accessibility

- GIVEN `selectable` is `true`
- WHEN CnDataTable renders
- THEN selection checkboxes MUST use `NcCheckboxRadioSwitch` (which provides proper `role`, `aria-checked`)
- AND the select-all checkbox MUST convey its `indeterminate` state to assistive technology

#### Scenario: Pagination button states

- GIVEN CnPagination renders with disabled navigation buttons
- THEN disabled buttons MUST have the `disabled` attribute (via NcButton)
- AND the page size selector MUST have an associated `<label>` via `for`/`id` binding (`pageSizeId`)

#### Scenario: Status badge text content

- GIVEN CnStatusBadge renders
- THEN the badge text MUST be readable by screen readers (no icon-only without aria-label)
- AND color MUST NOT be the sole means of conveying status (text label is always present)

### REQ-DD-015: NL Design System Theming

All data display components MUST be themeable through Nextcloud CSS variables (which are overridden by the nldesign app for government theming).

#### Scenario: CnObjectCard theming

- GIVEN CnObjectCard renders
- THEN borders MUST use `var(--color-border)`
- AND background MUST use `var(--color-main-background)`
- AND selected state MUST use `var(--color-primary-element)` for border and `var(--color-primary-element-light)` for background
- AND hover MUST use `var(--color-box-shadow)` for shadow
- AND border radius MUST use `var(--border-radius-large, 10px)` and `var(--border-radius)`

#### Scenario: CnCellRenderer theming

- GIVEN CnCellRenderer renders
- THEN UUID cells MUST use `var(--color-text-maxcontrast)` for color
- AND boolean success icons MUST use `var(--color-success)`
- AND dash placeholders MUST use `var(--color-text-maxcontrast)`

#### Scenario: CnFacetSidebar theming

- GIVEN CnFacetSidebar renders
- THEN the sidebar border MUST use `var(--color-border)` (right border)
- AND labels MUST use `var(--color-text-maxcontrast)`

#### Scenario: CSS class prefix convention

- GIVEN any data display component
- THEN ALL CSS classes MUST use the `cn-` prefix (e.g., `cn-data-table`, `cn-card-grid`, `cn-status-badge`)
- AND components MUST NOT reference `--nldesign-*` CSS variables directly (theming works via Nextcloud variable overrides)

---

## Requirements

### Requirement: CnDataTable — Scrollable Container Mode

CnDataTable MUST support an optional scrollable container mode via the `scrollable` prop.

#### Scenario: Scrollable table

- GIVEN `scrollable` is `true`
- WHEN CnDataTable renders
- THEN the root `cn-table-container` MUST have class `cn-table-container--scrollable`
- AND the container SHOULD constrain its height and enable vertical scrolling

#### Scenario: Non-scrollable (default)

- GIVEN `scrollable` is `false` (default)
- WHEN CnDataTable renders
- THEN `cn-table-container--scrollable` class MUST NOT be present
- AND the table MUST render at its natural height

### Requirement: CnObjectCard — Metadata Slot Override

CnObjectCard MUST support overriding the metadata section via a `#metadata` scoped slot.

#### Scenario: Custom metadata rendering

- GIVEN the parent provides a `#metadata` scoped slot
- WHEN CnObjectCard renders the metadata section
- THEN the slot MUST receive `{ object, fields }` scope (where `fields` is the computed `metadataFields`)
- AND the slot content MUST replace the default metadata grid rendering

### Requirement: CnPagination — Translatable Labels

CnPagination MUST accept all user-visible labels as translatable string props with English defaults.

#### Scenario: Custom label props

- GIVEN `firstLabel` is `'Eerste'`, `previousLabel` is `'Vorige'`, `nextLabel` is `'Volgende'`, `lastLabel` is `'Laatste'`, `itemsPerPageLabel` is `'Items per pagina:'`
- WHEN CnPagination renders
- THEN all button labels and the page size label MUST use the provided translations
- AND `pageInfoFormat` MUST support `{current}` and `{total}` placeholders (e.g., `'Pagina {current} van {total}'`)

---

## Current Implementation Status

**All specified components exist and are implemented:**

- **CnDataTable** -- `src/components/CnDataTable/CnDataTable.vue` (349 lines). Implements sortable columns, row selection with select-all checkbox, custom cell rendering via `#column-{key}` scoped slots, loading/empty states, schema-driven columns via `columnsFromSchema()`. Props include `columns`, `rows`, `schema`, `loading`, `sortKey`, `sortOrder`, `selectable`, `selectedIds`, `excludeColumns`, `includeColumns`, `columnOverrides`, `rowKey`, `emptyText`, `rowClass`, `scrollable`, `loadingText`. Emits `@sort`, `@select`, `@select-all`, `@row-click`.

- **CnCardGrid** -- `src/components/CnCardGrid/CnCardGrid.vue` (153 lines). Renders objects as CnObjectCard instances in a CSS Grid layout (`repeat(auto-fill, minmax(320px, 1fr))`). Supports `#card`, `#card-actions`, `#card-badges`, `#empty` scoped slots. Props: `objects`, `schema` (required), `loading`, `selectable`, `selectedIds`, `rowKey`, `emptyText`. Emits `@click`, `@select`.

- **CnObjectCard** -- `src/components/CnObjectCard/CnObjectCard.vue` (293 lines). Schema-configuration-driven card. Uses `schema.configuration` fields (`objectNameField`, `objectDescriptionField`, `objectSummaryField`, `objectImageField`) for layout. Renders metadata via CnCellRenderer. Props: `object` (required), `schema` (required), `selected`, `selectable`, `maxMetadata` (default 4). Emits `@click`, `@select`. Slots: `#badges`, `#metadata`, `#actions`.

- **CnCellRenderer** -- `src/components/CnCellRenderer/CnCellRenderer.vue` (133 lines). Type-aware formatting: booleans as CheckBold icon, enums as CnStatusBadge, arrays as comma-joined with overflow count, dates/UUIDs/URLs/emails/numbers/objects via `formatValue()`. Props: `value`, `property`, `truncate` (default 100). CSS classes applied by type: `cn-cell-renderer--boolean`, `--enum`, `--date`, `--uuid`, `--number`.

- **CnStatusBadge** -- `src/components/CnStatusBadge/CnStatusBadge.vue` (77 lines). Color-coded pill badge. Props: `label`, `variant` (default/primary/success/warning/error/info), `size` (small/medium), `colorMap`. Resolves variant from colorMap via case-insensitive label lookup with fallback.

- **CnPagination** -- `src/components/CnPagination/CnPagination.vue` (253 lines). Full pagination with First/Previous/Next/Last buttons, smart page number display with ellipsis (max 7 visible pages), page size selector via NcSelect. Props: `currentPage`, `totalPages`, `totalItems`, `currentPageSize`, `pageSizeOptions`, `minItemsToShow`, `firstLabel`, `previousLabel`, `nextLabel`, `lastLabel`, `itemsPerPageLabel`, `pageInfoFormat`. Emits `@page-changed`, `@page-size-changed`.

- **CnFilterBar** -- `src/components/CnFilterBar/CnFilterBar.vue` (152 lines). Search input with NcTextField + Magnify icon, filter controls (select, text, checkbox). Props: `filters`, `searchValue`, `searchPlaceholder`, `showClearAll`, `clearAllLabel`. Emits `@search`, `@filter-change`, `@clear-all`.

- **CnFacetSidebar** -- `src/components/CnFacetSidebar/CnFacetSidebar.vue` (232 lines). Auto-generated faceted filters from `filtersFromSchema(schema)`. Supports live facet data with counts, multi-select, boolean checkboxes. Props: `schema` (required), `facetData`, `activeFilters`, `loading`, `title`, `clearLabel`, `userIsAdmin`. Emits `@filter-change`, `@clear-all`.

- **CnKpiGrid** -- `src/components/CnKpiGrid/CnKpiGrid.vue` (90 lines). Responsive CSS Grid for KPI cards. Props: `columns` (2/3/4, default 4). Responsive: 4-col collapses to 2 at 1200px, 3-col to 2 at 900px, all to 1 at 600px.

**Supporting utilities:**
- `src/utils/schema.js` -- `columnsFromSchema(schema, options)`, `formatValue(value, property, options)`, `filtersFromSchema(schema)`, `fieldsFromSchema(schema, options)`

**Additional related components not in spec:**
- CnRowActions (`src/components/CnRowActions/`) -- Row action buttons used by CnDataTable
- CnMassActionBar (`src/components/CnMassActionBar/`) -- Floating bar for mass actions on selected rows
- CnStatsBlock (`src/components/CnStatsBlock/`) -- Stats display used inside CnKpiGrid

## Standards & References

- **Vue 2 Options API** -- All components follow Options API pattern
- **Nextcloud Vue** -- CnDataTable uses NcLoadingIcon, NcCheckboxRadioSwitch; CnPagination uses NcButton, NcSelect; CnFilterBar uses NcTextField, NcSelect, NcButton, NcCheckboxRadioSwitch; CnFacetSidebar uses NcButton, NcSelect, NcTextField, NcCheckboxRadioSwitch, NcLoadingIcon
- **Schema-driven rendering** -- `columnsFromSchema()` extracts columns from OpenRegister JSON Schema `properties` definitions; `filtersFromSchema()` reads `facetable: true` properties; `formatValue()` handles type/format-specific display formatting
- **CSS** -- `cn-` prefix on all classes, Nextcloud CSS variables for theming (never `--nldesign-*` directly)
- **WCAG AA** -- Semantic HTML table elements (`<table>`, `<thead>`, `<th>`, etc.); NcCheckboxRadioSwitch for accessible checkboxes; label/for bindings on pagination page size selector; color is never the sole status indicator (text always present)
- **Consumer apps** -- OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash all depend on these components via `@conduction/nextcloud-vue`
