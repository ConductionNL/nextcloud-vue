# Tasks: unified-grid-widget-system

## 1. Grid Foundation

### Task 1.1: Create gridLayout mixin
- **spec_ref**: `specs/grid-widget-system/spec.md#requirement-grid-layout-mixin-provides-shared-12-column-css-grid`
- **files**: `src/mixins/gridLayout.js`
- **acceptance_criteria**:
  - GIVEN the mixin is imported WHEN used in a component THEN it provides `sortedLayout` computed and `widgetGridStyle()` method
  - GIVEN a viewport < 600px WHEN the grid renders THEN all items span full width
- [x] Implement
- [x] Test (`tests/mixins/gridLayout.spec.js`)

### Task 1.2: Refactor CnDashboardPage to use gridLayout mixin
- **BLOCKED**: CnDashboardPage uses GridStack (JavaScript library with absolute positioning). Replacing with CSS Grid would break drag-and-drop editing. The gridLayout mixin is used by CnDetailPage instead.
- [x] Skipped (conflict documented)

## 2. Widget Components

### Task 2.1: Create CnKpiWidget
- **DEFERRED**: CnStatsBlock already provides nearly identical functionality (icon circle, variant colors, formatted count, click events, loading/empty states). Extend CnStatsBlock with `format`, `locale`, and `route` props in a separate change instead of creating a duplicate component.
- [x] Skipped (conflict documented — extend CnStatsBlock instead)

### Task 2.2: Create CnInfoWidget
- **spec_ref**: `specs/grid-widget-system/spec.md#requirement-cninfowidget-renders-label-value-pairs`
- **files**: `src/components/CnInfoWidget/CnInfoWidget.vue`, `src/components/CnInfoWidget/index.js`
- **acceptance_criteria**:
  - GIVEN object + schema WHEN rendered THEN generates label:value pairs from schema properties
  - GIVEN columns=3 WHEN rendered THEN CSS grid uses repeat(3, 1fr)
- [x] Implement
- [ ] Test

### Task 2.3: Create CnTableWidget
- **spec_ref**: `specs/grid-widget-system/spec.md#requirement-cntablewidget-renders-data-tables-with-dual-sourcing`
- **files**: `src/components/CnTableWidget/CnTableWidget.vue`, `src/components/CnTableWidget/index.js`
- **acceptance_criteria**:
  - GIVEN rows prop provided WHEN rendered THEN uses external data, no API calls
  - GIVEN register + schemaId, no rows WHEN mounted THEN fetches from OpenRegister API
  - GIVEN limit=5 and >5 rows WHEN rendered THEN shows 5 rows + "View all" link
- [x] Implement
- [ ] Test

### Task 2.4: Create CnChartWidget (CSS-only bar chart)
- **NAME COLLISION**: CnChartWidget already exists as ApexCharts wrapper. Creating a CSS-only variant with the same name would conflict. Deferred to a future change as CnBarChart.
- [x] Skipped (conflict documented)

## 3. Detail Page Grid Mode

### Task 3.1: Add layout/widgets props to CnDetailPage
- **spec_ref**: `specs/detail-page-grid/spec.md#requirement-cndetailpage-supports-optional-grid-layout`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`
- **acceptance_criteria**:
  - GIVEN layout prop provided WHEN rendered THEN content uses 12-column CSS grid
  - GIVEN no layout prop WHEN rendered THEN existing vertical stacking preserved
  - GIVEN layout + sidebar WHEN rendered THEN grid and sidebar coexist
- [x] Implement (via gridLayout mixin integration)
- [ ] Test

## 4. Exports and Integration

### Task 4.1: Add all new components to barrel exports
- **spec_ref**: `specs/grid-widget-system/spec.md#requirement-widget-components-are-exported-from-the-library-barrel`
- **files**: `src/components/index.js`, `src/index.js`
- **acceptance_criteria**:
  - GIVEN import { CnInfoWidget, CnTableWidget } from library WHEN app builds THEN imports resolve
  - GIVEN import { CnChartWidget, CnObjectSidebar } from library WHEN app builds THEN imports resolve (fixed missing exports)
- [x] Implement

### Task 4.2: Apply to larpingapp CharacterDetail
- **OUT OF SCOPE**: Cross-app change belongs in larpingapp, not the library.
- [x] Skipped (separate repo)

### Task 4.3: Replace dashboard KPI HTML with CnKpiWidget in larpingapp
- **OUT OF SCOPE**: Cross-app change belongs in larpingapp, not the library.
- [x] Skipped (separate repo)

## Verification
- [x] gridLayout mixin implemented and tested
- [x] CnInfoWidget implemented
- [x] CnTableWidget implemented
- [x] CnDetailPage grid layout mode added
- [x] Missing barrel exports fixed (CnChartWidget, CnObjectSidebar, CnInfoWidget, CnTableWidget)
- [ ] npm test passes in nextcloud-vue
- [ ] npm run build succeeds
