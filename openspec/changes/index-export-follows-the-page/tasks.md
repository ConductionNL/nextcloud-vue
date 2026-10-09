# Tasks: index-export-follows-the-page

> Row `rep-export` (humaniq), with the stackiq, buildiq and larpinq halves. `kind: code`.
> Checkbox budget: 4 tasks x 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: One query for the list and the file
- **spec_ref**: `openspec/changes/index-export-follows-the-page/specs/cnindexpage-export-action/spec.md#requirement-export-delegates-to-or-export-leaf`
- **files**: `src/composables/useListView.js`, `src/utils/indexExportHelpers.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `tests/utils/indexExportHelpers.spec.js`, `tests/components/CnIndexPageExportQuery.spec.js`
- **acceptance_criteria**:
  - `useListView` exposes the last params; `buildExportUrl` takes them and strips `_limit` and `_page`
  - The URL carries the page filter, the quick filter and `_search`
  - Verify: jest; mutation check: passing `$route.query` again reddens the quick-filter test
- [x] Implement
- [x] Test

### Task 2: Read the flag where OpenRegister keeps it
- **spec_ref**: `openspec/changes/index-export-follows-the-page/specs/cnindexpage-export-action/spec.md#requirement-export-action-on-index-pages`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `tests/components/CnIndexPageExportFlag.spec.js`
- **acceptance_criteria**:
  - `configuration.exportable` enables the menu; top-level wins when both are set; neither keeps it hidden
  - Verify: jest over the four combinations
- [x] Implement
- [x] Test

### Task 3: The mass export follows the selection or the filter
- **spec_ref**: `openspec/changes/index-export-follows-the-page/specs/cnindexpage-export-action/spec.md#requirement-the-mass-export-exports-the-selection-or-the-filter`
- **files**: `src/components/CnIndexPage/selfModeActions.js`, `src/components/CnIndexPage/selfModeIO.js`, `src/components/CnMassExportDialog/CnMassExportDialog.vue`, `tests/components/CnIndexPageMassExport.spec.js`
- **acceptance_criteria**:
  - A selection sends ids; no selection sends the list query; the dialog states which with the count
  - Verify: jest asserting the request for both cases
- [x] Implement
- [x] Test

### Task 4: Docs and the consumer check
- **spec_ref**: `openspec/changes/index-export-follows-the-page/specs/cnindexpage-export-action/spec.md#requirement-export-delegates-to-or-export-leaf`
- **files**: `docs/components/cn-index-page.md`, `docs/components/cn-mass-export-dialog.md`
- **acceptance_criteria**:
  - Docs state that the export follows the list and where the flag may live
  - Consumer check after release: stackiq's `insight-exports-and-custom-reports` e2e on `/contracten` passes against a real OpenRegister (recorded in this change's PR, not a gate here)
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`
- [x] Implement
- [ ] Test — not run: the consumer check needs stackiq's e2e against a real OpenRegister, after release
