# Tasks: index-bulk-edit-and-transitions

> Rows `pub-bulk` (opencatalogi) and `data-bulk-edit` (buildiq). `kind: code`.
> Checkbox budget: 6 tasks x 2 = 12 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `useBulkJob` over OpenRegister's bulk job
- **spec_ref**: `openspec/changes/index-bulk-edit-and-transitions/specs/index-page/spec.md#requirement-a-bulk-act-is-previewed-and-committed-as-one-openregister-job`
- **files**: `src/composables/useBulkJob.js`, `src/composables/index.js`, `tests/composables/useBulkJob.spec.js`
- **acceptance_criteria**:
  - `actions()` reads `/api/bulk-actions` once and caches it per session
  - `preview()` posts to `/api/bulk-jobs` and returns the envelope; `commit()`, `cancel()` and `poll()` follow the job
  - Verify: jest with a mocked axios; a commit before a preview is refused by the composable
- [ ] Implement
- [ ] Test

### Task 2: `CnBulkJobOutcome`
- **spec_ref**: `openspec/changes/index-bulk-edit-and-transitions/specs/index-page/spec.md#requirement-one-outcome-panel-renders-every-bulk-job`
- **files**: `src/components/CnBulkJobOutcome/`, `src/components/index.js`, `src/index.js`, `tests/components/CnBulkJobOutcome.spec.js`
- **acceptance_criteria**:
  - Counts, progress and the per-row list render from a fixture envelope
  - A refused row renders as refused, a skipped row as skipped, each with its reason
  - Verify: jest, plus `npm run check:a11y` gains the component
- [ ] Implement
- [ ] Test

### Task 3: Change a field
- **spec_ref**: `openspec/changes/index-bulk-edit-and-transitions/specs/index-page/spec.md#requirement-the-selection-strip-changes-one-field-on-every-selected-row`
- **files**: `src/components/CnBulkEditDialog/`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnActionsBar/CnActionsBar.vue`, `tests/components/CnBulkEditDialog.spec.js`
- **acceptance_criteria**:
  - Only `bulkEdit.fields` are offered; the value widget matches `CnFormDialog`'s for the property
  - An untouched empty input is not sent; "clear this field" sends `null`
  - `edit-field` is a reserved bulk id and a host entry with it is dropped with a warning
  - Verify: jest; mutation check: removing the fields filter reddens the undeclared-field test
- [ ] Implement
- [ ] Test

### Task 4: Run a step
- **spec_ref**: `openspec/changes/index-bulk-edit-and-transitions/specs/index-page/spec.md#requirement-the-selection-strip-runs-one-lifecycle-step-on-every-selected-row`
- **files**: `src/components/CnBulkEditDialog/`, `src/composables/useLifecycleTransitions.js`, `tests/components/CnBulkEditDialogStep.spec.js`
- **acceptance_criteria**:
  - The offered actions are the union of `available-actions` over the selection, each with its count
  - Absent or blocked rows appear as skipped in the preview with OpenRegister's description
  - Verify: jest over a mixed selection fixture
- [ ] Implement
- [ ] Test

### Task 5: Manifest keys and the capability check
- **spec_ref**: `openspec/changes/index-bulk-edit-and-transitions/specs/index-page/spec.md#requirement-a-bulk-act-is-previewed-and-committed-as-one-openregister-job`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `scripts/build-validators.js` output, `tests/schemas/bulkEdit.spec.js`
- **acceptance_criteria**:
  - The v2 schema accepts `bulkEdit.fields` and `bulkTransitions` on an index page and rejects a non-array `fields`
  - An action missing from `/api/bulk-actions` is not rendered even when declared
  - Verify: jest; `npm run build:validators` leaves no diff after commit
- [ ] Implement
- [ ] Test

### Task 6: Docs and the playground
- **spec_ref**: `openspec/changes/index-bulk-edit-and-transitions/specs/index-page/spec.md#requirement-the-selection-strip-changes-one-field-on-every-selected-row`
- **files**: `docs/components/cn-index-page.md`, `docs/components/cn-bulk-job-outcome.md`, `e2e/index-bulk-edit.e2e.js`
- **acceptance_criteria**:
  - The index page doc shows both config keys with one example each
  - A Playwright spec on the harness selects rows, previews, commits and reads the outcome panel
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`, `npm run test:e2e -- index-bulk-edit`
- [ ] Implement
- [ ] Test

### Task 7: Select all matching as a query selection
- **spec_ref**: `openspec/changes/index-bulk-edit-and-transitions/specs/index-page/spec.md#requirement-select-all-matching-hands-the-query-to-the-bulk-job`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnActionsBar/CnActionsBar.vue`, `src/components/CnIndexPage/selfModeActions.js`, `tests/components/CnIndexPageSelectAllMatching.spec.js`
- **acceptance_criteria**:
  - Offer shown only when the page is fully selected and `total` exceeds it
  - Job body `selection: {query}` built from the list request minus paging keys
  - Ceiling refusal shown with ceiling and count; filter, search or quick filter change clears the selection
  - Verify: jest; `npm run build`
- [ ] Implement
- [ ] Test

## Cross-project

- openregister: register `set-field` and `transition` in `BulkActionRegistry`. Listed for the openregister lane; this change hides both actions until they exist.
