# Tasks: screens-dashboard-greeting-header

## Implementation Tasks

### Task 1: Greeting in the subtitle
- **spec_ref**: `openspec/changes/screens-dashboard-greeting-header/specs/dashboard-page/spec.md#requirement-the-header-subtitle-can-greet-the-reader`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `greeting` prop, `greetingLine`, `subtitleText`
- [x] Test: afternoon and morning, first and full name, description alone without the key

### Task 2: The switch row
- **spec_ref**: `openspec/changes/screens-dashboard-greeting-header/specs/dashboard-page/spec.md#requirement-a-switch-row-carries-the-view-switch-and-link-pills`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: the row, `viewLinks`, the board switch move
- [x] Test: order in the row, route and href pills, translation, no row without views or links, the switch in the header without the board look
- [ ] Browser: DqMijnWerk on :8080 (not run: app lane checks after the release)

### Task 3: No page Actions menu
- **spec_ref**: `openspec/changes/screens-dashboard-greeting-header/specs/dashboard-page/spec.md#requirement-the-header-can-drop-the-page-actions-menu`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/schemas/app-manifest-v2.schema.json`
- [x] Implement: `showActionsMenu`
- [x] Test: menu by default, none with `false`; schema accepts the three keys (2.75.0)

### Task 4: Documentation
- **files**: `docs/components/cn-dashboard-page.md`
- [x] Document the three keys and the switch row
