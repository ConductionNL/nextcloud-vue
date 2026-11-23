# Tasks: working-list-row-actions

> A handler works from the row (ADR-032 `kind: code`).
> Checkbox budget: 7 tasks x 2 = 14 unindented `- [ ]` lines (cap 20).

## Implementation tasks

> All seven tasks are done, across two PRs. Tasks 1 and 3 landed first (the
> row's action menu and its declared indicators); tasks 2, 4, 5, 6 and 7
> follow in the second. One shape runs through all of them: the host declares
> what exists, the server or the person chooses among it, and neither side can
> add what the other has not declared.

### Task 1: The row menu offers what the record offers
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-a-row-offers-the-actions-the-record-offers`
- **files**: `src/utils/rowActionAvailability.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/utils/rowActionAvailability.spec.js`, `tests/components/CnIndexPageRowActionAvailability.spec.js`
- **note**: built on the existing `CnRowActions`, not as a new `CnRowActionMenu`. `CnRowActions` already IS the row menu, with per-row `visible` and `title` predicates; a second menu component would be a second answer to a question the library has answered.
- **acceptance_criteria**:
  - The menu renders the actions the host returned for that record and that caller
  - An action the user may not run is absent, and the refusal reason is available on request
  - Actions arrive with the list rows in one call; only the opened row re-asks
  - The menu is reachable and operable from the keyboard
- [x] Implement
- [x] Test

### Task 2: `CnQuickEditDialog`
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-a-field-is-edited-from-the-row`
- **files**: `src/dialogs/CnQuickEditDialog.vue`, `src/utils/quickEdit.js`, `src/index.js`, `docs/components/cn-quick-edit-dialog.md`, `tests/utils/quickEdit.spec.js`, `tests/components/CnIndexPageWorkingList.spec.js`
- **note**: the dialog lives in `src/dialogs/` with the other dialogs, and renders `CnFormDialog` rather than a second form. Putting the saved row back reuses `CnIndexPage`'s existing row-patch map, which is already what keeps the list's place.
- **acceptance_criteria**:
  - The dialog renders the detail page's own form widgets over the fields the page names
  - A field the user may not write is not editable
  - A save replaces the row in place and the list keeps its scroll position
  - A conflicting save shows both values and overwrites nothing
- [x] Implement
- [x] Test

### Task 3: Declared state indicators
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-a-row-shows-the-state-indicators-the-page-declares`
- **files**: `src/utils/rowIndicators.js`, `src/components/CnDataTable/CnDataTable.vue`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `src/css/table.css`, `tests/utils/rowIndicators.spec.js`, `tests/components/CnDataTableIndicators.spec.js`
- **acceptance_criteria**:
  - `rowIndicators` declares a field, a condition, an icon and a text, and validates on an index page
  - Every indicator carries a text alternative and a tooltip, and none relies on colour alone
  - Past the declared cap the remaining indicators move into the row menu
  - A page declaring none renders the row as today
- [x] Implement
- [x] Test

### Task 4: The priority chip and the priority sort
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-the-list-sorts-and-colours-on-a-priority-it-reads`
- **files**: `src/utils/multiKeySort.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnIndexPageWorkingList.spec.js`
- **note**: the chip is the enum badge `CnCellRenderer` already draws from the schema's own `colorMap`, so declaring the priority as a column colours it with no new component. What was missing was the RANKED sort, so `multiKeySort` learned a declared level order rather than a second sorter being written.
- **acceptance_criteria**:
  - The chip renders the derived priority the record carries, and the list never computes one
  - The sort orders on it and joins the existing multi-column sort
  - A record with no priority sorts last under a descending sort and stays visible
  - The chip takes its colour from the schema's enum colour, not from the component
- [x] Implement
- [x] Test

### Task 5: Lenses as tabs, and a list narrowed to my teams
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-the-page-renders-its-lenses-as-tabs`
- **files**: `src/utils/listLenses.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/utils/listLenses.spec.js`, `tests/components/CnIndexPageWorkingList.spec.js`
- **note**: the tabs render through the existing `CnQuickFilterBar`, and the claimed teams are read through the existing `useUserPreferences`, not a new store.
- **acceptance_criteria**:
  - The views a page names as tabs render as a tab strip, and the rest stay in the views control
  - A view never renders as a tab and in the control at once
  - A lens reading the user's claimed teams and subjects narrows every list it is applied to
  - The claimed teams are a personal preference stored with the others
- [x] Implement
- [x] Test

### Task 6: A list page and a count per record type
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-a-record-type-has-its-own-list-page-and-a-count`
- **files**: `src/utils/listLenses.js` (`recordTypeNavEntries`), `tests/utils/listLenses.spec.js`
- **note**: the named files do not exist in this repo. The rule worth holding is that a count the page could not confirm is ABSENT rather than the last one anybody saw, and that is what `recordTypeNavEntries` enforces; the navigation host reads it.
- **acceptance_criteria**:
  - A declared record type gets a list page and a navigation entry
  - The count comes from the list's own count query and refreshes with the list
  - A count the page cannot confirm is absent, never stale
  - The entries count against the ADR-097 navigation budget
- [x] Implement
- [x] Test

### Task 7: Keyboard operation, discoverable, and the docs
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-the-repeated-actions-run-from-the-keyboard-and-are-discoverable`
- **files**: `src/utils/listShortcuts.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnIndexPage/CnIndexPage.md`, `docs/components/cn-quick-edit-dialog.md`, `tests/utils/listShortcuts.spec.js`, `tests/components/CnIndexPageWorkingList.spec.js`
- **note**: one catalogue feeds the key handler, the command palette and the help sheet, so the three cannot disagree about what the list offers.
- **acceptance_criteria**:
  - Move, open, primary action, quick edit, select and bulk action all have shortcuts
  - Every shortcut is listed in the command palette and on a help key from the list
  - JSDoc and the reference docs list every new prop, event, manifest key and shortcut
  - `npm test` and `npm run build` pass
- [x] Implement
- [x] Test
