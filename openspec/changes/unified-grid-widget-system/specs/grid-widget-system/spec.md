# Grid Widget System Specification

## Purpose

Provides a set of reusable, self-contained widget components for displaying data in grid-based layouts (dashboards and detail pages). Replaces copy-pasted KPI cards, info grids, relation tables, and status charts across all Conduction apps.

## ADDED Requirements

### Requirement: CnKpiWidget renders a KPI card

The `CnKpiWidget` component SHALL render a single KPI metric with an icon circle, formatted value, and label. It MUST accept `value`, `label`, `icon` (MDI component), and `variant` (default|primary|success|warning|error) props. It MUST format values using `format` prop (text|number|currency|percent) with `locale` support.

#### Scenario: KPI renders with number format
- GIVEN a CnKpiWidget with value `1234`, label `"Characters"`, format `"number"`, locale `"nl-NL"`
- WHEN the component renders
- THEN it displays `"1.234"` as the formatted value
- AND displays `"Characters"` as the label
- AND applies the default variant styling

#### Scenario: KPI applies variant styling
- GIVEN a CnKpiWidget with variant `"warning"`
- WHEN the component renders
- THEN the icon circle background uses `var(--color-warning-light)`
- AND the icon color uses `var(--color-warning)`

#### Scenario: KPI navigates on click
- GIVEN a CnKpiWidget with a `route` prop set to `{ name: 'Characters' }`
- WHEN the user clicks the KPI card
- THEN the router navigates to the Characters route

### Requirement: CnInfoWidget renders label-value pairs

The `CnInfoWidget` component SHALL render a responsive grid of label:value pairs. It MUST support two modes: manual (`fields` prop with `{ label, value }` objects) and auto-generated (`object` + `schema` props). It MUST accept `columns` (1|2|3), `includeFields`, and `excludeFields` props.

#### Scenario: Auto-generated from schema
- GIVEN a CnInfoWidget with an `object` and `schema` prop
- WHEN the component renders
- THEN it generates one label:value pair per schema property
- AND uses the schema property `title` as the label (falling back to the key)
- AND uses the object's property value as the value

#### Scenario: Manual fields
- GIVEN a CnInfoWidget with `fields` prop `[{ label: 'Email', value: 'test@example.com' }]`
- WHEN the component renders
- THEN it displays "Email" as the label and "test@example.com" as the value

#### Scenario: Column layout
- GIVEN a CnInfoWidget with `columns` set to `3`
- WHEN the component renders
- THEN the CSS grid uses `repeat(3, 1fr)` for the field layout

### Requirement: CnTableWidget renders data tables with dual sourcing

The `CnTableWidget` component SHALL wrap `CnDataTable` in a card container with a title header, optional "View all" footer, and loading state. It MUST support two data modes: external (`:rows` prop provided) and self-fetch (`:register` + `:schema-id` provided).

#### Scenario: External data mode
- GIVEN a CnTableWidget with `:rows="myData"` and `:columns="myCols"`
- WHEN the component renders
- THEN it passes `myData` as rows to the internal CnDataTable
- AND does NOT make any API calls

#### Scenario: Self-fetch mode
- GIVEN a CnTableWidget with `register="9"`, `schema-id="42"`, and no `rows` prop
- WHEN the component mounts
- THEN it fetches data from `/index.php/apps/openregister/api/objects/9/42`
- AND displays a loading state while fetching
- AND renders the fetched results in the table

#### Scenario: Row limit and view-all
- GIVEN a CnTableWidget with `limit` set to `5` and `view-all-route` set to `{ name: 'Skills' }`
- WHEN there are more than 5 rows
- THEN only 5 rows are displayed
- AND a "View all" link appears in the footer

#### Scenario: Row click navigation
- GIVEN a CnTableWidget with a `row-click-route` function
- WHEN the user clicks a table row
- THEN the router navigates to the route returned by the function

### Requirement: CnChartWidget renders horizontal bar charts

The `CnChartWidget` component SHALL render pure CSS horizontal bar charts without any external chart library. It MUST accept a `data` prop (array of `{ label, value, color? }`) and a `title` prop.

#### Scenario: Horizontal bars render proportionally
- GIVEN a CnChartWidget with data `[{ label: 'Open', value: 75 }, { label: 'Closed', value: 25 }]`
- WHEN the component renders
- THEN "Open" has a bar width of 75% and "Closed" has 25%
- AND each bar shows the label and value count

#### Scenario: Empty state
- GIVEN a CnChartWidget with an empty `data` array
- WHEN the component renders
- THEN it displays the `emptyText` message

### Requirement: Grid layout mixin provides shared 12-column CSS grid

The `gridLayout` mixin SHALL provide a `sortedLayout` computed property, a `widgetGridStyle(item)` method, and the `.cn-grid-layout` CSS class. Both `CnDashboardPage` and `CnDetailPage` MUST use this mixin for grid rendering.

#### Scenario: Layout items are sorted and positioned
- GIVEN a layout array with items at various gridX/gridY positions
- WHEN the grid renders
- THEN items are sorted by gridY (ascending) then gridX (ascending)
- AND each item's CSS `grid-column` is set to `(gridX + 1) / (gridX + gridWidth + 1)`

#### Scenario: Responsive breakpoints
- GIVEN a grid layout at viewport width < 600px
- WHEN the grid renders
- THEN all items span the full width (single column)

### Requirement: Widget components are exported from the library barrel

All new widget components (CnKpiWidget, CnInfoWidget, CnTableWidget, CnChartWidget) MUST be exported from `src/components/index.js` and `src/index.js`.

#### Scenario: Import from library
- GIVEN an app imports `{ CnKpiWidget, CnTableWidget } from '@conduction/nextcloud-vue'`
- WHEN the app builds with webpack
- THEN the imports resolve successfully

---

## Implementation Reality Notes (Added 2026-03-16)

### Current Behavior: How dashboards render today

CnDashboardPage does NOT use CSS Grid. It delegates to CnDashboardGrid, which uses the **GridStack** JavaScript library (`import { GridStack } from 'gridstack'`). GridStack manages widget positioning via absolute pixel positioning, not CSS Grid properties. The grid supports drag-and-drop and resize in edit mode.

The existing KPI system uses **CnKpiGrid** (a responsive CSS grid wrapper with 2/3/4 column support) containing **CnStatsBlock** components (icon + formatted count + variant + breakdown). This is already exported and used across apps.

### Conflict Notes

1. **Requirement "Grid layout mixin provides shared 12-column CSS grid"** — This requirement states the mixin is "extracted from CnDashboardPage." There is nothing to extract: CnDashboardPage uses GridStack, not CSS Grid. The mixin must be **newly created**, not extracted. CnDashboardPage cannot adopt this mixin without losing GridStack drag-and-drop functionality. The mixin should only be used by CnDetailPage (static layout) and potentially future static grid contexts.

2. **Requirement "CnKpiWidget renders a KPI card"** — CnStatsBlock already exists with nearly identical functionality: icon circle, variant colors (default/primary/success/warning/error), formatted count, clickable state, and loading/empty states. The difference is CnStatsBlock lacks `format` (number/currency/percent), `locale`, and `route` props. Consider extending CnStatsBlock rather than creating a duplicate component.

3. **Requirement "CnChartWidget renders horizontal bar charts"** — CnChartWidget already exists as an **ApexCharts wrapper** (supports area, line, bar, pie, donut, radialBar). It is NOT exported from the barrel (bug). The proposed pure CSS bar chart would collide with this existing component name. Recommendation: use a different name (e.g., CnBarChart) or add a CSS-only mode to the existing component.

4. **Barrel export requirement** — The spec correctly identifies missing exports, but underestimates the scope: CnChartWidget, CnDetailCard, CnDetailPage, and CnObjectSidebar are ALL missing from barrel exports currently.

### Missing Accessibility Notes

- **KPI widgets (CnStatsBlock/CnKpiWidget)**: When clickable, should use `role="link"` or be rendered as `<a>` elements (CnStatsBlock already renders as `<a>` when clickable — good). Must have `aria-label` describing the metric for screen readers.
- **Grid layout**: The CSS Grid mixin produces a presentational layout. It should NOT use `role="grid"` (which implies interactive grid navigation). Use no ARIA role or `role="presentation"` on the grid container.
- **Chart widgets**: Pure CSS bar charts should include `role="img"` and `aria-label` with a text summary of the data for screen reader users. Percentage bars need visible or visually-hidden text labels.
- **CnTableWidget**: Inherits CnDataTable accessibility (already uses `<table>` with proper semantics). The wrapper should ensure the title is associated via `aria-labelledby`.
