# Tasks: layout-phone-width

> Sibling halves of humaniq `self-service-mobile` and larpinq `admin-phone-friendly-pages`. `kind: code`.
> Checkbox budget: 6 tasks x 2 = 12 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The phone check first
- **spec_ref**: `openspec/changes/layout-phone-width/specs/phone-width-layout/spec.md#requirement-the-phone-layout-is-checked-where-layout-exists`
- **files**: `e2e/phone-width.e2e.js`, `e2e/harness/` pages as needed
- **acceptance_criteria**:
  - Four pages at 360 by 740 assert no horizontal scroll and a visible first heading
  - Written first and shown red on development for the table and the dashboard, so the later tasks turn it green
  - Verify: `npm run test:e2e -- phone-width`
- [ ] Implement
- [ ] Test

### Task 2: Cards for a narrow table
- **spec_ref**: `openspec/changes/layout-phone-width/specs/phone-width-layout/spec.md#requirement-a-narrow-table-shows-its-rows-as-cards`
- **files**: `src/components/CnDataTable/CnDataTable.vue`, `src/css/index-page.css`, `tests/components/CnDataTableNarrow.spec.js`
- **acceptance_criteria**:
  - Container query at 600 px with a ResizeObserver fallback class; `stackOnNarrow: false` keeps the table
  - Selection, row actions, row click and focus work on cards
  - Verify: jest for the fallback class and markup; the phone check for layout
- [ ] Implement
- [ ] Test

### Task 3: Dashboard reflow by default
- **spec_ref**: `openspec/changes/layout-phone-width/specs/phone-width-layout/spec.md#requirement-a-dashboard-reflows-to-one-column-at-phone-width`
- **files**: `src/components/CnDashboardPage/CnDashboardPage.vue`, `tests/components/CnDashboardPageResponsive.spec.js`
- **acceptance_criteria**:
  - `getDashboardColumnOpts()` is passed unless the page supplies `columnOpts` or `responsive: false`
  - Verify: jest; the phone check
- [ ] Implement
- [ ] Test

### Task 4: Action bar and sidebar
- **spec_ref**: `openspec/changes/layout-phone-width/specs/phone-width-layout/spec.md#requirement-the-index-pages-controls-fit-a-phone`
- **files**: `src/components/CnActionsBar/CnActionsBar.vue`, `src/components/CnIndexSidebar/CnIndexSidebar.vue`, `tests/components/CnActionsBarNarrow.spec.js`
- **acceptance_criteria**:
  - Add and search stay; other actions fold into one menu; the sidebar is a full-width panel with close
  - Verify: jest; `npm run check:a11y`; the phone check
- [ ] Implement
- [ ] Test

### Task 5: Full-screen forms and the detail page
- **spec_ref**: `openspec/changes/layout-phone-width/specs/phone-width-layout/spec.md#requirement-forms-are-full-screen-at-phone-width`
- **files**: `src/components/CnFormDialog/CnFormDialog.vue`, `src/css/detail-page.css`, `tests/components/CnFormDialogNarrow.spec.js`
- **acceptance_criteria**:
  - The dialog asks for full size at phone width; Save stays in view; the detail grid and tabs stack
  - Verify: jest; the phone check
- [ ] Implement
- [ ] Test

### Task 6: Docs
- **spec_ref**: `openspec/changes/layout-phone-width/specs/phone-width-layout/spec.md#requirement-a-narrow-table-shows-its-rows-as-cards`
- **files**: `docs/components/cn-data-table.md`, `docs/components/cn-dashboard-page.md`, `docs/components/cn-index-page.md`
- **acceptance_criteria**:
  - Docs describe the breakpoint, `stackOnNarrow` and `responsive`
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`
- [ ] Implement
- [ ] Test
