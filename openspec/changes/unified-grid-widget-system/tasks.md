# Tasks: unified-grid-widget-system

## 1. Grid Foundation

### Task 1.1: Create gridLayout mixin
- **spec_ref**: `specs/grid-widget-system/spec.md#requirement-grid-layout-mixin-provides-shared-12-column-css-grid`
- **files**: `src/mixins/gridLayout.js`
- **acceptance_criteria**:
  - GIVEN the mixin is imported WHEN used in a component THEN it provides `sortedLayout` computed and `widgetGridStyle()` method
  - GIVEN a viewport < 600px WHEN the grid renders THEN all items span full width
- [ ] Implement
- [ ] Test

### Task 1.2: Refactor CnDashboardPage to use gridLayout mixin
- **spec_ref**: `specs/grid-widget-system/spec.md#requirement-grid-layout-mixin-provides-shared-12-column-css-grid`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`
- **acceptance_criteria**:
  - GIVEN CnDashboardPage uses the mixin WHEN rendering THEN output is identical to current behavior
- [ ] Implement
- [ ] Test

## 2. Widget Components

### Task 2.1: Create CnKpiWidget
- **spec_ref**: `specs/grid-widget-system/spec.md#requirement-cnkpiwidget-renders-a-kpi-card`
- **files**: `src/components/CnKpiWidget/CnKpiWidget.vue`, `src/components/CnKpiWidget/index.js`
- **acceptance_criteria**:
  - GIVEN value=1234, format="number", locale="nl-NL" WHEN rendered THEN displays "1.234"
  - GIVEN variant="warning" WHEN rendered THEN icon uses warning colors
- [ ] Implement
- [ ] Test

### Task 2.2: Create CnInfoWidget
- **spec_ref**: `specs/grid-widget-system/spec.md#requirement-cninfowidget-renders-label-value-pairs`
- **files**: `src/components/CnInfoWidget/CnInfoWidget.vue`, `src/components/CnInfoWidget/index.js`
- **acceptance_criteria**:
  - GIVEN object + schema WHEN rendered THEN generates label:value pairs from schema properties
  - GIVEN columns=3 WHEN rendered THEN CSS grid uses repeat(3, 1fr)
- [ ] Implement
- [ ] Test

### Task 2.3: Create CnTableWidget
- **spec_ref**: `specs/grid-widget-system/spec.md#requirement-cntablewidget-renders-data-tables-with-dual-sourcing`
- **files**: `src/components/CnTableWidget/CnTableWidget.vue`, `src/components/CnTableWidget/index.js`
- **acceptance_criteria**:
  - GIVEN rows prop provided WHEN rendered THEN uses external data, no API calls
  - GIVEN register + schemaId, no rows WHEN mounted THEN fetches from OpenRegister API
  - GIVEN limit=5 and >5 rows WHEN rendered THEN shows 5 rows + "View all" link
- [ ] Implement
- [ ] Test

### Task 2.4: Create CnChartWidget
- **spec_ref**: `specs/grid-widget-system/spec.md#requirement-cnchartwidget-renders-horizontal-bar-charts`
- **files**: `src/components/CnChartWidget/CnChartWidget.vue`, `src/components/CnChartWidget/index.js`
- **acceptance_criteria**:
  - GIVEN data with values 75 and 25 WHEN rendered THEN bars have proportional widths
  - GIVEN empty data WHEN rendered THEN shows emptyText
- [ ] Implement
- [ ] Test

## 3. Detail Page Grid Mode

### Task 3.1: Add layout/widgets props to CnDetailPage
- **spec_ref**: `specs/detail-page-grid/spec.md#requirement-cndetailpage-supports-optional-grid-layout`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`
- **acceptance_criteria**:
  - GIVEN layout prop provided WHEN rendered THEN content uses 12-column CSS grid
  - GIVEN no layout prop WHEN rendered THEN existing vertical stacking preserved
  - GIVEN layout + sidebar WHEN rendered THEN grid and sidebar coexist
- [ ] Implement
- [ ] Test

## 4. Exports and Integration

### Task 4.1: Add all new components to barrel exports
- **spec_ref**: `specs/grid-widget-system/spec.md#requirement-widget-components-are-exported-from-the-library-barrel`
- **files**: `src/components/index.js`, `src/index.js`
- **acceptance_criteria**:
  - GIVEN import { CnKpiWidget, CnInfoWidget, CnTableWidget, CnChartWidget } from library WHEN app builds THEN imports resolve
  - GIVEN import { CnDetailPage, CnDetailCard } from library WHEN app builds THEN imports resolve (fix missing exports)
- [ ] Implement
- [ ] Test

### Task 4.2: Apply to larpingapp CharacterDetail
- **spec_ref**: `specs/detail-page-grid/spec.md#requirement-cndetailpage-supports-optional-grid-layout`
- **files**: `../larpingapp/src/views/characters/CharacterDetail.vue`
- **acceptance_criteria**:
  - GIVEN CharacterDetail uses grid layout WHEN rendered THEN details + stats show side by side (8+4 cols)
  - GIVEN character has related skills/items WHEN rendered THEN CnTableWidget shows them in 6+6 col pairs
- [ ] Implement
- [ ] Test

### Task 4.3: Replace dashboard KPI HTML with CnKpiWidget in larpingapp
- **spec_ref**: `specs/grid-widget-system/spec.md#requirement-cnkpiwidget-renders-a-kpi-card`
- **files**: `../larpingapp/src/views/dashboard/Dashboard.vue`
- **acceptance_criteria**:
  - GIVEN dashboard uses CnKpiWidget WHEN rendered THEN KPI cards look identical to current styling
  - GIVEN inline .kpi-card CSS removed WHEN built THEN no regressions
- [ ] Implement
- [ ] Test

## Implementation Conflict Notes (Added 2026-03-16)

### Task 1.2 — BLOCKED: Cannot refactor CnDashboardPage to use CSS Grid mixin
CnDashboardPage delegates to CnDashboardGrid which uses **GridStack** (JavaScript library with absolute positioning). Replacing GridStack with CSS Grid would break drag-and-drop editing. **Recommended change:** Remove Task 1.2 or change it to "Verify layout array format compatibility between GridStack layout items and CSS Grid mixin's widgetGridStyle()."

### Task 2.1 — OVERLAP: CnKpiWidget duplicates CnStatsBlock
CnStatsBlock already provides icon circles, variant colors, formatted counts, click events, and loading/empty states. Consider extending CnStatsBlock with `format`, `locale`, and `route` props instead of creating CnKpiWidget. If CnKpiWidget is still created, it must be clearly differentiated from CnStatsBlock.

### Task 2.4 — NAME COLLISION: CnChartWidget already exists (ApexCharts)
The existing CnChartWidget is an ApexCharts wrapper. Creating a pure CSS bar chart with the same name will cause a conflict. Rename the proposed component (e.g., CnBarChart) or add CSS-only mode to existing CnChartWidget.

### Task 4.1 — SCOPE EXPANSION: More missing exports than documented
In addition to the new components, 4 existing components need barrel exports: CnChartWidget, CnDetailCard, CnDetailPage, CnObjectSidebar.

## Verification

- [ ] All tasks checked off
- [ ] `npm test` passes in nextcloud-vue
- [ ] `npm run build` succeeds for larpingapp
- [ ] Browser test: CharacterDetail grid layout renders correctly
- [ ] Browser test: Dashboard KPIs render via CnKpiWidget
- [ ] Existing dashboards (pipelinq, procest) unchanged — no regressions
