# Tasks: index-copy-with-relations

> Row `land-copy-entry` (stackiq). `kind: code`.
> Checkbox budget: 5 tasks x 2 = 10 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `useObjectCopy`
- **spec_ref**: `openspec/changes/index-copy-with-relations/specs/dialog-system/spec.md#requirement-a-copy-with-links-is-one-openregister-request`
- **files**: `src/composables/useObjectCopy.js`, `src/composables/index.js`, `tests/composables/useObjectCopy.spec.js`
- **acceptance_criteria**:
  - `links(source, include)` reads `/used`, `/relation-rows` and files for the included kinds only
  - `copy(source, name, include)` posts once to the copy endpoint and returns the new object and the per-link outcome
  - `available()` answers false when the endpoint is absent (404 or 405)
  - Verify: jest with mocked axios
- [x] Implement
- [x] Test

### Task 2: The link list in `CnCopyDialog`
- **spec_ref**: `openspec/changes/index-copy-with-relations/specs/dialog-system/spec.md#requirement-the-copy-dialog-lists-the-links-a-copy-can-take-along`
- **files**: `src/components/CnCopyDialog/CnCopyDialog.vue`, `tests/components/CnCopyDialogLinks.spec.js`
- **acceptance_criteria**:
  - Included kinds render with titles (first ten) and a count, ticked by default and untickable
  - No `include`: the dialog renders exactly as before (snapshot of the form phase)
  - Verify: jest; `npm run check:a11y` covers the checkboxes' labels
- [x] Implement
- [x] Test — jest; `npm run check:a11y` is not run: needs a browser

### Task 3: Wire the copy paths
- **spec_ref**: `openspec/changes/index-copy-with-relations/specs/dialog-system/spec.md#requirement-a-copy-with-links-is-one-openregister-request`
- **files**: `src/components/CnIndexPage/selfModeActions.js`, `src/components/CnMassCopyDialog/CnMassCopyDialog.vue`, `tests/components/CnIndexPageCopyLinks.spec.js`
- **acceptance_criteria**:
  - With `copy.include` and the endpoint present, single and mass copy call it; without, `cloneObjectForCopy` runs as today
  - The result phase lists refused links with their reason and links to the new object
  - Verify: jest; mutation check: reverting to `cloneObjectForCopy` reddens the endpoint test
- [x] Implement
- [x] Test

### Task 4: The fallback
- **spec_ref**: `openspec/changes/index-copy-with-relations/specs/dialog-system/spec.md#requirement-without-the-server-copy-links-are-shown-and-not-copied`
- **files**: `src/components/CnCopyDialog/CnCopyDialog.vue`, `tests/components/CnCopyDialogFallback.spec.js`
- **acceptance_criteria**:
  - Endpoint absent: the list is read-only with the note, and fields-only copy runs
  - Verify: jest
- [x] Implement
- [x] Test

### Task 5: Manifest key and docs
- **spec_ref**: `openspec/changes/index-copy-with-relations/specs/dialog-system/spec.md#requirement-the-copy-dialog-lists-the-links-a-copy-can-take-along`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `tests/schemas/copyInclude.spec.js`, `docs/components/cn-copy-dialog.md`, `docs/components/cn-index-page.md`
- **acceptance_criteria**:
  - The v2 schema accepts `copy.include` with the three kinds and rejects others
  - Docs show the key and the fallback
  - Verify: jest; `npm run build:validators`, `npm run check:docs`, `npm run check:docs-fresh`
- [x] Implement
- [x] Test — `npm run check:docs` run; `npm run check:docs-fresh` is not run: the orchestrator regenerates docs/components/_generated

## Cross-project

- openregister: `POST /api/objects/{register}/{schema}/{id}/copy` with overrides and `include`, answering the new object and a per-link outcome. Listed for the openregister lane. — not run: needs openregister (the library side is built and falls back to a fields-only copy until the endpoint exists)
