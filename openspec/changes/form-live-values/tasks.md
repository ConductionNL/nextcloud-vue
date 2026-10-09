# Tasks: form-live-values

> Row `form-conditional-values` (buildiq), with buildiq's `forms-live-values-and-checks` renderer half. `kind: code`.
> Checkbox budget: 5 tasks x 2 = 10 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `assign` rules
- **spec_ref**: `openspec/changes/form-live-values/specs/dialog-system/spec.md#requirement-a-field-is-filled-in-from-another-answer`
- **files**: `src/components/CnFormPage/CnFormPage.vue`, `src/components/CnFormDialog/CnFormDialog.vue`, `src/utils/formAssign.js`, `tests/utils/formAssign.spec.js`, `tests/components/CnFormPageAssign.spec.js`
- **acceptance_criteria**:
  - First matching rule sets the field when an answer it reads changes; hand edits stop the rules until reset
  - A rule that reads its own field does not loop
  - Verify: jest; mutation check: removing the hand-edit guard reddens the Typing wins test
- [x] Implement
- [x] Test

### Task 2: Token defaults
- **spec_ref**: `openspec/changes/form-live-values/specs/dialog-system/spec.md#requirement-a-default-is-resolved-from-the-user-or-the-record`
- **files**: `src/utils/sentinelTokens.js`, `src/utils/resolveFilterTokens.js`, `src/components/CnFormPage/CnFormPage.vue`, `tests/utils/resolveFilterTokensMe.spec.js`
- **acceptance_criteria**:
  - `@me.displayName` and `@me.email` resolve from the current user; `@object.<field>` from the record
  - `initialValue` wins over a default
  - Verify: jest
- [x] Implement
- [x] Test

### Task 3: The `calculate` hook
- **spec_ref**: `openspec/changes/form-live-values/specs/dialog-system/spec.md#requirement-a-field-is-calculated-by-the-host`
- **files**: `src/components/CnFormPage/CnFormPage.vue`, `tests/components/CnFormPageCalculate.spec.js`
- **acceptance_criteria**:
  - Called after 400 ms of quiet for a field whose inputs changed; the field is read-only; a rejection keeps the value and shows the sentence
  - Verify: jest with fake timers
- [x] Implement
- [x] Test

### Task 4: Unmet conditions
- **spec_ref**: `openspec/changes/form-live-values/specs/dialog-system/spec.md#requirement-unmet-conditions-are-shown-beside-submit`
- **files**: `src/components/CnFormPage/CnFormPage.vue`, `tests/components/CnFormPageUnmet.spec.js`, `tests/a11y/CnFormPage.a11y.spec.js`
- **acceptance_criteria**:
  - The list renders above submit; `blockSubmit` disables submit with the first message as reason
  - Verify: jest; `npm run check:a11y`
- [x] Implement
- [x] Test — jest; `npm run check:a11y` is not run: needs a browser

### Task 5: Manifest schema and docs
- **spec_ref**: `openspec/changes/form-live-values/specs/dialog-system/spec.md#requirement-a-field-is-filled-in-from-another-answer`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `tests/schemas/formFieldLiveValues.spec.js`, `docs/components/cn-form-page.md`, `docs/components/cn-form-dialog.md`
- **acceptance_criteria**:
  - The v2 schema accepts `assign`, token `default` and `calculate.inputs` on a form field
  - Docs show one example each and state that calculation belongs to the host
  - Verify: `npm run build:validators`, `npm run check:docs`, `npm run check:docs-fresh`
- [x] Implement
- [x] Test — `npm run check:docs` run; `npm run check:docs-fresh` is not run: the orchestrator regenerates docs/components/_generated
