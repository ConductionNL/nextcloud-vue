# Tasks: dashboard-widget-system

## 1. Add GridStack dependency

### Task 1.1: Add gridstack to package.json
- **files**: `nextcloud-vue/package.json`
- **acceptance_criteria**:
  - GIVEN the library THEN `gridstack` v10.3.1+ is listed as a direct dependency
- [x] 1.1 Add `gridstack: "^10.3.1"` to `dependencies` in package.json

---

## 2. Create CnDashboardGrid component

### Task 2.1: Implement grid layout engine
- **spec_ref**: `specs/dashboard-grid/spec.md`
- **files**: `nextcloud-vue/src/components/CnDashboardGrid/CnDashboardGrid.vue`, `nextcloud-vue/src/components/CnDashboardGrid/index.js`
- **acceptance_criteria**:
  - GIVEN `layout` with items WHEN mounted THEN GridStack renders items at correct positions
  - GIVEN `editable` is `false` THEN drag/resize is disabled
  - GIVEN drag/resize occurs THEN `@layout-change` is emitted with updated positions
  - GIVEN `layout` prop changes THEN grid synchronizes (add/remove items)
- [x] 2.1 Create CnDashboardGrid.vue wrapping GridStack.js with drag/drop/resize and layout sync

---

## 3. Create CnWidgetWrapper component

### Task 3.1: Implement widget container shell
- **spec_ref**: `specs/widget-wrapper/spec.md`
- **files**: `nextcloud-vue/src/components/CnWidgetWrapper/CnWidgetWrapper.vue`, `nextcloud-vue/src/components/CnWidgetWrapper/index.js`
- **acceptance_criteria**:
  - GIVEN `showTitle` is `true` THEN header with icon and title is rendered
  - GIVEN `showTitle` is `false` THEN no header rendered
  - GIVEN default slot content THEN content area renders it
  - GIVEN `#header-actions` slot THEN actions appear in header
  - GIVEN `#footer` slot THEN footer is rendered
- [x] 3.1 Create CnWidgetWrapper.vue with header (icon + title), content slot, header-actions slot, footer slot

---

## 4. Create CnWidgetRenderer component

### Task 4.1: Implement NC Dashboard API widget renderer
- **spec_ref**: `specs/widget-renderer/spec.md`
- **files**: `nextcloud-vue/src/components/CnWidgetRenderer/CnWidgetRenderer.vue`, `nextcloud-vue/src/components/CnWidgetRenderer/index.js`
- **acceptance_criteria**:
  - GIVEN NC widget with `itemApiVersions` WHEN mounted THEN items are fetched from OCS and rendered
  - GIVEN refresh interval THEN items are periodically refreshed
  - GIVEN API error THEN `unavailableText` is shown
  - GIVEN component destroyed THEN refresh timer is cleared
- [x] 4.1 Create CnWidgetRenderer.vue that fetches and renders NC Dashboard API v1/v2 widgets with auto-refresh

---

## 5. Create CnTileWidget component

### Task 5.1: Implement quick-access tile
- **spec_ref**: `specs/tile-widget/spec.md`
- **files**: `nextcloud-vue/src/components/CnTileWidget/CnTileWidget.vue`, `nextcloud-vue/src/components/CnTileWidget/index.js`
- **acceptance_criteria**:
  - GIVEN `iconType` is `'svg'`/`'class'`/`'url'`/`'emoji'` THEN correct icon rendering
  - GIVEN `linkType` is `'app'` THEN navigates within Nextcloud
  - GIVEN `linkType` is `'url'` THEN opens in new tab
  - GIVEN custom colors THEN applied to tile
- [x] 5.1 Create CnTileWidget.vue with icon rendering (4 types), link behavior (2 types), and color styling

---

## 6. Create CnDashboardPage component

### Task 6.1: Implement top-level dashboard page
- **spec_ref**: `specs/dashboard-page/spec.md`
- **files**: `nextcloud-vue/src/components/CnDashboardPage/CnDashboardPage.vue`, `nextcloud-vue/src/components/CnDashboardPage/index.js`
- **acceptance_criteria**:
  - GIVEN `widgets` and `layout` THEN renders header + grid with widget type auto-detection
  - GIVEN `#widget-{id}` scoped slot THEN custom content is rendered for that widget
  - GIVEN NC API widget THEN CnWidgetRenderer is used
  - GIVEN tile widget THEN CnTileWidget is used
  - GIVEN `allowEdit` THEN edit toggle is shown; drag/resize enabled in edit mode
  - GIVEN empty layout THEN empty state is shown
  - GIVEN layout change THEN `@layout-change` is emitted
- [x] 6.1 Create CnDashboardPage.vue assembling header, CnDashboardGrid, and widget rendering with type resolution

---

## 7. Create useDashboardView composable

### Task 7.1: Implement dashboard state composable
- **spec_ref**: `specs/use-dashboard-view/spec.md`
- **files**: `nextcloud-vue/src/composables/useDashboardView.js`
- **acceptance_criteria**:
  - GIVEN `options.widgets` THEN `widgets` ref contains them
  - GIVEN `loadLayout` returns layout THEN it is used; otherwise `defaultLayout` is used
  - GIVEN `onLayoutChange` called THEN layout updates and `saveLayout` is called
  - GIVEN `includeNcWidgets: true` THEN NC widgets fetched from OCS and merged
  - GIVEN `addWidget`/`removeWidget` called THEN layout is updated
  - GIVEN `activeWidgetIds` THEN reflects widgets currently in layout
- [x] 7.1 Create useDashboardView.js with widget management, layout loading/saving, NC widget discovery, add/remove operations

---

## 8. Add dashboard CSS

### Task 8.1: Create dashboard stylesheet
- **files**: `nextcloud-vue/src/css/dashboard.css`, `nextcloud-vue/src/css/index.css`
- **acceptance_criteria**:
  - GIVEN `dashboard.css` THEN styles use `cn-` prefix and Nextcloud CSS variables only
  - GIVEN `index.css` THEN `dashboard.css` is imported
- [x] 8.1 Create dashboard.css with grid, widget, KPI, chart, and list styles; add import to index.css

---

## 9. Wire barrel exports

### Task 9.1: Add components and composable to barrel exports
- **files**: `nextcloud-vue/src/components/index.js`, `nextcloud-vue/src/composables/index.js`, `nextcloud-vue/src/index.js`
- **acceptance_criteria**:
  - GIVEN `import { CnDashboardPage } from '@conduction/nextcloud-vue'` THEN the component is available
  - GIVEN all 5 components + composable THEN all are importable from the barrel
- [x] 9.1 Add CnDashboardPage, CnDashboardGrid, CnWidgetWrapper, CnWidgetRenderer, CnTileWidget to component barrel; add useDashboardView to composable barrel; add all to main barrel

---

## 10. Update documentation

### Task 10.1: Update CLAUDE.md with dashboard documentation
- **files**: `nextcloud-vue/CLAUDE.md`
- **acceptance_criteria**:
  - GIVEN CLAUDE.md THEN Dashboard components are listed with props, events, slots
  - GIVEN CLAUDE.md THEN useDashboardView is documented with options and return values
  - GIVEN CLAUDE.md THEN implementation pattern example is included
- [x] 10.1 Add Dashboard section to CLAUDE.md: component list, CnDashboardPage Widget System docs, useDashboardView API, implementation pattern example

---

## 11. Migrate procest dashboard (proof of concept)

### Task 11.1: Convert procest Dashboard.vue to CnDashboardPage
- **files**: `procest/src/views/Dashboard.vue`
- **acceptance_criteria**:
  - GIVEN the migrated dashboard THEN it uses CnDashboardPage with widget definitions and layout
  - GIVEN existing KPIs, status chart, and my-work widgets THEN all render correctly via `#widget-{id}` scoped slots
  - GIVEN the dashboard THEN existing data loading and computation is preserved
- [x] 11.1 Rewrite Dashboard.vue to use CnDashboardPage with 3 widgets (kpis, cases-by-status, my-work) rendered via scoped slots

---

## Verification

- [x] All 5 components have Vue SFC + index.js barrel files
- [x] useDashboardView composable created and exported
- [x] dashboard.css created and imported
- [x] All exports wired through barrel chain (component → components/index.js → src/index.js)
- [x] CLAUDE.md updated with full documentation
- [x] Procest dashboard renders correctly with CnDashboardPage (verified via browser)
- [x] GridStack grid shows KPI cards, status chart, and my-work widgets
- [x] No hardcoded colors — all styles use Nextcloud CSS variables
- [x] All CSS classes use `cn-` prefix
