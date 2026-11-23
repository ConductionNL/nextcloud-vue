# Tasks: transition-input-reference-and-subfields

> Reference pickers and object sub-fields in `CnTransitionInputDialog`
> (ADR-032 `kind: code`).

## Implementation tasks

### Task 1: CnResourceSelect filter and exclude
- **spec_ref**: `openspec/changes/transition-input-reference-and-subfields/specs/manifest-detail-lifecycle-actions/spec.md#requirement-a-reference-input-is-picked-never-typed`
- **files**: `src/components/CnResourceSelect/CnResourceSelect.vue`, `tests/components/CnResourceSelectFilter.spec.js`
- **acceptance_criteria**:
  - `filter` (default `{}`) passed to the list query; `exclude` (default `[]`) removes ids from the options
  - JSDoc on both props
- [x] Implement
- [x] Test

### Task 2: Reference and object inputs in the dialog
- **spec_ref**: `openspec/changes/transition-input-reference-and-subfields/specs/manifest-detail-lifecycle-actions/spec.md#requirement-an-object-input-can-be-filled-one-field-at-a-time`
- **files**: `src/dialogs/CnTransitionInputDialog.vue`, `src/dialogs/CnTransitionInputDialog.md`, `tests/dialogs/CnTransitionInputDialogReference.spec.js`, `tests/dialogs/CnTransitionInputDialogSubfields.spec.js`
- **acceptance_criteria**:
  - `$ref` inputs render `CnResourceSelect` with `picker` applied; value is the uuid
  - Object inputs render sub-properties, narrowed by `fields`; sent merged over the current value; no dotted keys
  - New prop `currentObject` (default `null`) for `excludeSelf` and the merge base
- [x] Implement
- [x] Test

### Task 3: Hints from the manifest
- **spec_ref**: `openspec/changes/transition-input-reference-and-subfields/specs/manifest-detail-lifecycle-actions/spec.md#requirement-input-hints-apply-to-server-declared-transitions`
- **files**: `src/components/CnLifecycleActions/CnLifecycleActions.vue`, `src/components/CnDetailPage/CnDetailPage.vue`, `src/schemas/app-manifest-v2.schema.json`, `tests/components/CnLifecycleActionsInputHints.spec.js`
- **acceptance_criteria**:
  - `config.lifecycleActions.inputs` merged by `field`; unknown fields warned and ignored
  - Manifest schema accepts the key
  - `npm test` and `npm run build` pass
- [x] Implement
- [x] Test

> The manifest schema is at 2.59.0: `config.lifecycleActions` is typed only through `if type object then inputs`, because deployed manifests carry other shapes there. `CnLifecycleActions` gained a `register` prop (default `''`) that `CnDetailPage` fills. `npm run build` is not run here.
