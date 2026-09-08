# Tasks: dashboard-layout-per-user

> Per-user layout persistence on `CnDashboardPage` (ADR-032 `kind: code`).
> Checkbox budget: 3 tasks × 2 = 6 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: Load and merge a per-user layout
- **spec_ref**: `openspec/changes/dashboard-layout-per-user/specs/dashboard-page/spec.md#requirement-per-user-layout-opt-in`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/composables/useDashboardView.js`, `src/store/plugins/dashboardLayouts.js`, `src/components/__tests__/CnDashboardPageUserLayout.spec.js`
- **acceptance_criteria**:
  - `config.userLayout: true` loads the user record before the first grid render
  - A page without the key makes no layout request
  - Manifest removals and additions merge per the design rule
- [ ] Implement
- [ ] Test

### Task 2: Save on leaving edit mode, reset to manifest
- **spec_ref**: `openspec/changes/dashboard-layout-per-user/specs/dashboard-page/spec.md#requirement-user-layout-saved-and-reset`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `src/store/plugins/dashboardLayouts.js`, `src/components/__tests__/CnDashboardPageUserLayout.spec.js`
- **acceptance_criteria**:
  - One PUT on leaving edit mode, none during drag
  - "Reset layout" deletes the record and re-renders the manifest layout
  - Component reference doc and JSDoc updated
- [ ] Implement
- [ ] Test

### Task 3: User-addable widget picker with presets
- **spec_ref**: `openspec/changes/dashboard-layout-per-user/specs/dashboard-page/spec.md#requirement-user-picks-from-the-catalog-and-presets`
- **files**: `src/components/CnDashboardPage/CnWidgetPicker.vue`, `src/registry/dashboardWidgetRegistry.js`, `src/components/__tests__/CnWidgetPicker.spec.js`
- **acceptance_criteria**:
  - Picker lists registry kinds with `userAddable: true` and `config.userWidgets[]` presets
  - A saved-view preset lists the user's views and binds one
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
