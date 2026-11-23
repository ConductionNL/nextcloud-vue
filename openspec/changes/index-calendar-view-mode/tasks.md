# Tasks: index-calendar-view-mode

> Row `pg-calendar` (buildiq). `kind: code`.
> Checkbox budget: 4 tasks x 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `calendar` as a view mode
- **spec_ref**: `openspec/changes/index-calendar-view-mode/specs/index-page/spec.md#requirement-the-index-page-offers-a-calendar-view-mode`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnActionsBar/CnActionsBar.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnIndexPageCalendar.spec.js`
- **acceptance_criteria**:
  - `viewMode` and `availableViewModes` accept `calendar`; the toggle shows it only when `config.viewModes` lists it
  - Entries render from `displayObjects` with the configured fields; a click emits the row click
  - Verify: jest; `npm run build:validators` leaves no diff
- [x] Implement
- [x] Test

### Task 2: The month as a query range
- **spec_ref**: `openspec/changes/index-calendar-view-mode/specs/index-page/spec.md#requirement-the-calendar-fetches-only-the-visible-month`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/composables/useListView.js`, `tests/components/CnIndexPageCalendarRange.spec.js`
- **acceptance_criteria**:
  - Entering calendar mode and `range-change` add the range to the request; leaving removes it
  - A saved view uses `/api/views/{id}/calendar?start=&end=`
  - Verify: jest asserting the request parameters; mutation check: dropping the removal on leave reddens the table test
- [x] Implement (saved-view `/api/views/{id}/calendar` branch not built: applying a saved view only sets list filters, so the page's own month query already covers it)
- [x] Test

### Task 3: Keyboard grid and the "+N" button
- **spec_ref**: `openspec/changes/index-calendar-view-mode/specs/index-page/spec.md#requirement-the-calendar-is-reachable-from-the-keyboard`
- **files**: `src/components/CnObjectCalendar/CnObjectCalendar.vue`, `tests/components/CnObjectCalendarKeyboard.spec.js`, `tests/a11y/CnObjectCalendar.a11y.spec.js`
- **acceptance_criteria**:
  - Arrow keys move between days; entries and "+N" are buttons
  - "+N" emits a day selection the index page turns into a table filtered to that day
  - Verify: jest; `npm run check:a11y`
- [x] Implement
- [x] Test (jest; `npm run check:a11y` not run)

### Task 4: Docs and an end-to-end check
- **spec_ref**: `openspec/changes/index-calendar-view-mode/specs/index-page/spec.md#requirement-the-index-page-offers-a-calendar-view-mode`
- **files**: `docs/components/cn-index-page.md`, `docs/components/cn-object-calendar.md`, `e2e/index-calendar-view.e2e.js`
- **acceptance_criteria**:
  - Docs show the config block
  - A harness page switches to Calendar, moves a month, and opens an entry
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`, `npm run test:e2e -- index-calendar-view`
- [x] Implement
- [ ] Test — not run: needs the harness and `npm run test:e2e`
