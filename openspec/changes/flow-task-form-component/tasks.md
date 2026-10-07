# Tasks: flow-task-form-component

> A task completion dialog over OpenRegister `flow-task-forms` (ADR-032 `kind: code`).

## Implementation tasks

### Task 1: Load the task, its schema and its subject
- **spec_ref**: `openspec/changes/flow-task-form-component/specs/flow-task-form/spec.md#requirement-cntaskformdialog-renders-the-form-openregister-resolved-for-the-task`
- **files**: `src/components/CnTaskFormDialog/CnTaskFormDialog.vue`, `index.js`, `src/components/index.js`, `tests/components/CnTaskFormDialog.spec.js`
- **acceptance_criteria**:
  - Props `taskUuid`, `task`, `outcome` (default `done`), `submit` (default `true`), all with defaults
  - `CnFormDialog` receives `includeFields` (renderable fields) and `fieldOverrides` (`required`, `order` from the declaration)
  - `form: null` renders a comment field only
  - JSDoc on props and events
- [ ] Implement
- [ ] Test

### Task 2: Broken, unresolvable and unavailable states
- **spec_ref**: `openspec/changes/flow-task-form-component/specs/flow-task-form/spec.md#requirement-a-field-the-schema-no-longer-offers-is-shown-as-a-disabled-row`
- **files**: `src/components/CnTaskFormDialog/CnTaskFormDialog.vue`, `tests/components/CnTaskFormDialog.spec.js`
- **acceptance_criteria**:
  - One disabled row per non-renderable field, above the fields in declared order, with the server's `reason`
  - Confirm disabled when a broken field is required, or the form is unresolvable or unavailable
  - CSS classes prefixed `cn-`
- [ ] Implement
- [ ] Test

### Task 3: Complete and handle refusals
- **spec_ref**: `openspec/changes/flow-task-form-component/specs/flow-task-form/spec.md#requirement-confirm-completes-the-task-and-a-refusal-keeps-the-dialog-open`
- **files**: `src/components/CnTaskFormDialog/CnTaskFormDialog.vue`, `src/components/CnTaskFormDialog/CnTaskFormDialog.md`, `tests/components/CnTaskFormDialog.spec.js`, component reference docs
- **acceptance_criteria**:
  - POST body `{outcome, comment, data}`; `completed` emitted on 200
  - 400 with `fields` keeps values and marks rows per design D3; unrendered names go to the top message
  - `submit: false` emits `confirm` and honours `setResult()`
  - `npm test` and `npm run build` pass
- [ ] Implement
- [ ] Test
