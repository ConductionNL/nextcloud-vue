# Tasks: action-dialog-acts-and-sources

### Task 1: Each act posts to its own endpoint
- **spec_ref**: `openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-each-act-posts-to-its-own-endpoint`
- **files**: `src/components/CnActionDialog/CnActionDialog.vue`, `src/utils/actionDialogForm.js`, `docs/components/cn-action-dialog.md`
- [x] Implement: `confirm.requestsBy`, `fieldsInBody`, whole `{fields.<name>}` tokens in a body
- [x] Test: `tests/components/CnActionDialogActsAndSources.spec.js`

### Task 2: A field shows only when another value says so
- **spec_ref**: `openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-a-field-shows-only-when-another-value-says-so`
- **files**: `src/components/CnActionDialog/CnActionDialog.vue`, `src/utils/actionDialogForm.js`
- [x] Implement: `visibleWhen` on fields and the note, `note.textsBy`
- [x] Test: `tests/components/CnActionDialogActsAndSources.spec.js`

### Task 3: A field reads its options from an endpoint
- **spec_ref**: `openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-a-field-reads-its-options-from-an-endpoint`
- **files**: `src/components/CnActionDialog/CnActionDialog.vue`, `src/utils/actionDialogForm.js`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: `optionsSource` with `match`, `search` and `errorText`
- [x] Test: `tests/components/CnActionDialogActsAndSources.spec.js`

### Task 4: Ticked can mean left out
- **spec_ref**: `openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-ticked-can-mean-left-out`
- **files**: `src/components/CnActionDialog/CnActionDialog.vue`, `src/utils/actionDialogForm.js`
- [x] Implement: `sendUnticked`, `sendAs`
- [x] Test: `tests/components/CnActionDialogActsAndSources.spec.js`

### Task 5: A checks field can tick in columns that exclude each other
- **spec_ref**: `openspec/changes/action-dialog-acts-and-sources/specs/action-dialog/spec.md#requirement-a-checks-field-can-tick-in-columns-that-exclude-each-other`
- **files**: `src/components/CnActionDialog/CnActionDialog.vue`, `src/utils/actionDialogForm.js`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: `columns`, `exclusive`, `hideWhenEmpty`, `requireOneOf`, `source`
- [x] Test: `tests/components/CnActionDialogActsAndSources.spec.js`
