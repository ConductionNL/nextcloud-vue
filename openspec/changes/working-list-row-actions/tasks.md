# Tasks: working-list-row-actions

> A handler works from the row (ADR-032 `kind: code`).
> Checkbox budget: 7 tasks x 2 = 14 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `CnRowActionMenu`
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-a-row-offers-the-actions-the-record-offers`
- **files**: `src/components/CnRowActionMenu/CnRowActionMenu.vue`, `src/components/CnRowActionMenu/index.js`, `src/components/index.js`, `src/index.js`, `src/components/__tests__/CnRowActionMenu.spec.js`
- **acceptance_criteria**:
  - The menu renders the actions the host returned for that record and that caller
  - An action the user may not run is absent, and the refusal reason is available on request
  - Actions arrive with the list rows in one call; only the opened row re-asks
  - The menu is reachable and operable from the keyboard
- [ ] Implement
- [ ] Test

### Task 2: `CnQuickEditDialog`
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-a-field-is-edited-from-the-row`
- **files**: `src/components/CnQuickEditDialog/CnQuickEditDialog.vue`, `src/components/CnQuickEditDialog/index.js`, `src/components/index.js`, `src/index.js`, `src/components/__tests__/CnQuickEditDialog.spec.js`
- **acceptance_criteria**:
  - The dialog renders the detail page's own form widgets over the fields the page names
  - A field the user may not write is not editable
  - A save replaces the row in place and the list keeps its scroll position
  - A conflicting save shows both values and overwrites nothing
- [ ] Implement
- [ ] Test

### Task 3: Declared state indicators
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-a-row-shows-the-state-indicators-the-page-declares`
- **files**: `src/components/CnDataTable/CnDataTable.vue`, `src/manifest/schema/manifest-v2.schema.json`, `src/manifest/validateManifestV2.js`, `src/components/__tests__/CnDataTableIndicators.spec.js`
- **acceptance_criteria**:
  - `rowIndicators` declares a field, a condition, an icon and a text, and validates on an index page
  - Every indicator carries a text alternative and a tooltip, and none relies on colour alone
  - Past the declared cap the remaining indicators move into the row menu
  - A page declaring none renders the row as today
- [ ] Implement
- [ ] Test

### Task 4: The priority chip and the priority sort
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-the-list-sorts-and-colours-on-a-priority-it-reads`
- **files**: `src/components/CnDataTable/CnDataTable.vue`, `src/composables/useListView.js`, `src/components/__tests__/CnDataTablePriority.spec.js`
- **acceptance_criteria**:
  - The chip renders the derived priority the record carries, and the list never computes one
  - The sort orders on it and joins the existing multi-column sort
  - A record with no priority sorts last under a descending sort and stays visible
  - The chip takes its colour from the schema's enum colour, not from the component
- [ ] Implement
- [ ] Test

### Task 5: Lenses as tabs, and a list narrowed to my teams
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-the-page-renders-its-lenses-as-tabs`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/composables/useListView.js`, `src/stores/preferences.js`, `src/components/__tests__/CnIndexPageTabs.spec.js`
- **acceptance_criteria**:
  - The views a page names as tabs render as a tab strip, and the rest stay in the views control
  - A view never renders as a tab and in the control at once
  - A lens reading the user's claimed teams and subjects narrows every list it is applied to
  - The claimed teams are a personal preference stored with the others
- [ ] Implement
- [ ] Test

### Task 6: A list page and a count per record type
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-a-record-type-has-its-own-list-page-and-a-count`
- **files**: `src/manifest/buildNavigation.js`, `src/manifest/buildRouter.js`, `src/manifest/__tests__/buildNavigation.spec.js`
- **acceptance_criteria**:
  - A declared record type gets a list page and a navigation entry
  - The count comes from the list's own count query and refreshes with the list
  - A count the page cannot confirm is absent, never stale
  - The entries count against the ADR-097 navigation budget
- [ ] Implement
- [ ] Test

### Task 7: Keyboard operation, discoverable, and the docs
- **spec_ref**: `openspec/changes/working-list-row-actions/specs/index-page/spec.md#requirement-the-repeated-actions-run-from-the-keyboard-and-are-discoverable`
- **files**: `src/composables/useKeyboardShortcuts.js`, `src/components/CnCommandPalette/`, `docs/components/cn-index-page.md`, `docs/components/cn-row-action-menu.md`
- **acceptance_criteria**:
  - Move, open, primary action, quick edit, select and bulk action all have shortcuts
  - Every shortcut is listed in the command palette and on a help key from the list
  - JSDoc and the reference docs list every new prop, event, manifest key and shortcut
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
