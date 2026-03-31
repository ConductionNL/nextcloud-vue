# Proposal: unified-grid-widget-system

## Summary

Create a unified 12-column CSS grid system that works for both dashboards and detail pages, with reusable widget components (KPI, info, table, chart) that eliminate copy-pasted markup across all Conduction apps. Extend `CnDetailPage` with optional grid layout mode using the same engine as `CnDashboardPage`, and support both Nextcloud Dashboard API widgets and custom widgets in the same grid.

## Motivation

Every Conduction app duplicates KPI card markup, info-grid CSS, and relation tables. Pipelinq's `ClientDetail` has three raw `<table>` elements. Procest and Pipelinq copy-paste identical `.kpi-card` CSS in their dashboards. Detail pages stack `CnDetailCard` components vertically with no grid control, wasting screen space on wide screens. The dashboard's 12-column grid works well but is locked to `CnDashboardPage` — detail pages can't use it. This change extracts the grid into a shared system and creates reusable widgets to replace the duplicated patterns.

## Affected Projects

- [x] Project: `nextcloud-vue` — new widget components, grid mixin, CnDetailPage grid mode, barrel exports
- [x] Project: `larpingapp` — first app to adopt: CharacterDetail grid layout, dashboard KPI replacement
- [x] Project: `pipelinq` — dashboard KPI replacement, ClientDetail table widgets (future)
- [x] Project: `procest` — dashboard KPI replacement (future)
- [x] Project: `opencatalogi` — dashboard KPI replacement (future)
- [x] Project: `openregister` — dashboard KPI replacement (future)

## Scope

### In Scope

- **CnKpiWidget** — reusable KPI card (icon, value, label, variant)
- **CnInfoWidget** — label:value info grid, auto-generated from schema or manual fields
- **CnTableWidget** — wraps CnDataTable with dual data sourcing (external rows prop OR self-fetch from OpenRegister)
- **CnChartWidget** — pure CSS horizontal bar chart (no chart library dependency)
- **Grid mixin** — shared 12-column CSS grid logic extracted from CnDashboardPage
- **CnDetailPage grid mode** — optional `layout` + `widgets` props for grid-based detail pages (backwards compatible)
- **Barrel export fixes** — add CnDetailPage, CnDetailCard, CnObjectSidebar + new widgets to exports
- **Larpingapp CharacterDetail** — convert to grid layout as reference implementation

### Out of Scope

- GridStack drag-and-drop editing (existing CnDashboardGrid stays as-is for future use)
- Converting all app detail pages (only larpingapp as first example)
- Chart library integration (ApexCharts etc. — OpenConnector keeps its own)
- Layout persistence to backend
- Nextcloud Dashboard API widget registration (OCA.Dashboard.register — apps handle this independently)

## Approach

1. Extract shared grid CSS from CnDashboardPage into a Vue mixin
2. Create 4 new widget components in the library
3. Add optional grid mode to CnDetailPage (null layout = backwards compatible vertical stacking)
4. Fix missing barrel exports
5. Apply to larpingapp CharacterDetail as reference implementation
6. Replace inline KPI HTML in dashboards with CnKpiWidget

## Capabilities

### New Capabilities

- `grid-widget-system` — unified grid layout engine and reusable widget components
- `detail-page-grid` — grid layout mode for CnDetailPage

### Modified Capabilities

- `layout-components` — CnDashboardPage refactored to use shared grid mixin
- `data-display` — new widget components added to the data display family

## Cross-Project Dependencies

- All consumer apps (OpenRegister, OpenCatalogi, Procest, Pipelinq, MyDash) use the webpack alias `@conduction/nextcloud-vue` pointing to the library source — changes are picked up on next build
- CnTableWidget's self-fetch mode depends on OpenRegister API (`/apps/openregister/api/objects/`)
- Relations data (uses/used endpoints) already supported by the store's relationsPlugin

## Rollback Strategy

- All new components are additive — removing them doesn't break existing apps
- CnDetailPage grid mode is opt-in via `layout` prop — default `null` preserves existing behavior
- Grid mixin extraction is an internal refactor with identical output
- If CnDetailPage grid mode has issues, apps revert to vertical stacking by removing the `layout` prop

## Current State Analysis

### Existing Grid/Widget/Layout Components (as of 2026-03-16)

| Component | Status | What It Does |
|-----------|--------|-------------|
| **CnDashboardPage** | Exists, exported | Top-level dashboard page — delegates grid rendering to CnDashboardGrid |
| **CnDashboardGrid** | Exists, exported | **GridStack-powered** drag-and-drop grid (imports `GridStack` from `gridstack` npm package). NOT CSS Grid. |
| **CnWidgetWrapper** | Exists, exported | Widget container shell with header (icon + title), scrollable content, footer with action buttons, style config |
| **CnWidgetRenderer** | Exists, exported | Renders NC Dashboard API widgets (v1/v2) with auto-refresh via OCS API |
| **CnTileWidget** | Exists, exported | Quick-access tile with icon and link |
| **CnKpiGrid** | Exists, exported | Responsive CSS grid wrapper for CnStatsBlock children (2/3/4 columns with media breakpoints) |
| **CnStatsBlock** | Exists, exported | KPI card with icon circle, formatted count, breakdown, variant styling, click navigation — largely overlaps proposed CnKpiWidget |
| **CnChartWidget** | Exists, **NOT exported** | **ApexCharts wrapper** (peer dependency on `apexcharts` + `vue-apexcharts`). Supports area, line, bar, pie, donut, radialBar. NOT pure CSS. |
| **CnDetailPage** | Exists, **NOT exported** | Card-based detail page with header, back button, sidebar — vertical flex stacking only |
| **CnDetailCard** | Exists, **NOT exported** | Individual card section for CnDetailPage — NOT exported |
| **CnObjectSidebar** | Exists, **NOT exported** | Sidebar for files, notes, tags, tasks, audit trail — NOT exported |

### Component Overlap Analysis

1. **CnKpiGrid + CnStatsBlock vs proposed CnKpiWidget**: CnStatsBlock already provides icon circles, formatted counts, variant styling (default/primary/success/warning/error), click navigation, horizontal/vertical layouts, and breakdown details. CnKpiGrid wraps them in a responsive CSS grid. The proposed CnKpiWidget largely duplicates CnStatsBlock. Consider whether to extend CnStatsBlock with `format` and `locale` props rather than creating a new component.

2. **CnChartWidget (ApexCharts) vs proposed pure CSS CnChartWidget**: The existing CnChartWidget is a full ApexCharts wrapper supporting 6 chart types with Nextcloud theming. The spec proposes replacing this with a pure CSS horizontal bar chart. These are fundamentally different components. The existing CnChartWidget handles complex visualization needs (time series, pie charts); a CSS-only bar chart would be a simpler, lighter alternative for basic status distributions. Consider renaming the proposed component (e.g., CnBarChart) to avoid name collision, or treating them as complementary.

3. **Barrel export gaps**: 4 existing components are NOT exported: CnChartWidget, CnDetailCard, CnDetailPage, CnObjectSidebar. These must be fixed regardless of other changes.

4. **No mixins directory**: `src/mixins/` does not exist yet — needs to be created for the proposed gridLayout mixin.

### Applicable Standards

- **CSS Grid Layout Module Level 2** (W3C CR): The grid mixin should use standard `grid-template-columns`, `grid-column`, and `grid-row` properties per the CSS Grid specification
- **WAI-ARIA grid pattern** (WAI-ARIA Authoring Practices 1.2): If the grid is interactive (keyboard navigation between cells), it should use `role="grid"`, `role="row"`, `role="gridcell"`. For purely presentational layouts, `role="presentation"` or no role is appropriate. Dashboard widgets are presentational — no grid role needed.
- **WCAG 2.1 AA**: All widgets must meet 4.5:1 contrast ratio (already covered by Nextcloud CSS variables), keyboard operability (focus indicators on interactive elements), and meaningful content order for screen readers
- **Responsive Web Design**: The 12→6→1 column breakpoint pattern (900px, 600px) aligns with common responsive breakpoints

## Open Questions

1. **CnKpiWidget vs CnStatsBlock**: Should the new CnKpiWidget replace CnStatsBlock, extend it, or be a separate component? CnStatsBlock already covers most of the proposed functionality.
2. **CnChartWidget name collision**: The proposed pure CSS chart component conflicts with the existing ApexCharts-based CnChartWidget. Should the new component use a different name (e.g., CnBarChart)?
3. **GridStack extraction feasibility**: The spec assumes extracting a CSS Grid mixin from CnDashboardPage, but CnDashboardPage uses GridStack (JavaScript-driven layout engine). A CSS Grid mixin would be a new implementation, not an extraction. See design.md for full conflict analysis.
