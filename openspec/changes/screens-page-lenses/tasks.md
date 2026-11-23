# Tasks: screens-page-lenses

### Task 1: Chips with counts
- **spec_ref**: `openspec/changes/screens-page-lenses/specs/page-lenses/spec.md#requirement-a-workspace-filter-can-draw-chips-with-counts`
- **files**: `src/components/CnWorkspaceFilterWidget/CnWorkspaceFilterWidget.vue`
- [x] Implement: `style: "chips"`, `count`, `countFrom`
- [x] Test: `tests/components/ScreensPageLenses.spec.js`; e2e `e2e/page-lenses.e2e.js`

### Task 2: The address
- **spec_ref**: `openspec/changes/screens-page-lenses/specs/page-lenses/spec.md#requirement-the-choice-is-in-the-address`
- [x] Implement: `urlKey`
- [x] Test: `tests/components/ScreensPageLenses.spec.js`

### Task 3: A widget shown by a workspace value
- **spec_ref**: `openspec/changes/screens-page-lenses/specs/page-lenses/spec.md#requirement-a-widget-can-be-shown-by-a-workspace-value`
- **files**: `src/utils/visibleWhen.js`, `src/components/CnDashboardPage/CnDashboardPage.vue`
- [x] Implement: WORKSPACE mode, operator `in`, grid and KPI row collapse
- [x] Test: `tests/components/ScreensPageLenses.spec.js`, `tests/schemas/app-manifest-v2.schema.spec.js`

### Task 4: Schema 2.87.0 and docs
- [x] `src/schemas/app-manifest-v2.schema.json`, hash recorded
- [x] `docs/components/cn-workspace-filter-widget.md` section "Chips and page lenses"
