# Tasks: object-actions-ui

### Task 1: Read and run actions
- **spec_ref**: `specs/object-actions-ui/spec.md#requirement-a-host-reads-the-actions-of-an-object-from-openregister`, `#requirement-a-run-reports-what-happened`, `#requirement-an-async-run-shows-its-progress-and-its-result`, `#requirement-the-last-run-reads-both-audit-names`
- **files**: `src/utils/objectActions.js`, `src/composables/useObjectActions.js`
- [x] Test: `tests/composables/useObjectActions.spec.js`
- [x] Implement: list, selection list, run, selection run, run watch, history
- [x] Docs: `docs/utilities/composables/use-object-actions.md`, `read-object-actions.md`, `run-object-action.md`, `actions-for-surface.md`

### Task 2: The inputs dialog
- **spec_ref**: `#requirement-inputs-are-asked-in-a-dialog-built-from-their-json-schema`, `#requirement-an-async-run-shows-its-progress-and-its-result`
- **files**: `src/utils/objectActionInputs.js`, `src/dialogs/CnObjectActionDialog.vue`, `src/components/CnTransitionInputFields/CnTransitionInputFields.vue` (a `password` widget)
- [x] Test: `tests/dialogs/CnObjectActionDialog.spec.js`
- [x] Implement: inputs from JSON Schema, defaults, run, refusal, async progress, suspended, selection summary, `next`
- [x] Docs: `docs/components/cn-object-action-dialog.md`; en/nl strings

### Task 3: Header actions
- **spec_ref**: `#requirement-a-manifest-runs-a-declared-action`, `#requirement-actionsfrom-renders-the-listed-actions-on-a-surface`, `#requirement-an-unavailable-action-is-shown-disabled-with-its-reason`
- **files**: `src/components/CnActionButtons/CnActionButtons.vue`, `src/utils/actionsDispatcher.js`, `src/utils/objectActions.js` (`expandObjectActionEntries`), `src/components/CnDetailPage/CnDetailPage.vue` (`next`), `src/schemas/app-manifest-v2.schema.json` (2.140.0)
- [x] Test: `tests/components/CnActionButtonsObjectActions.spec.js`
- [x] Implement: `type: "object-action"`, `actionsFrom` on header actions, disabled with reason, dialog or direct run, `next` on the detail page
- [x] Docs: `cn-action-buttons.md`, `dispatch-action.md`, `cn-detail-page.md`; en/nl strings

### Task 4: Row and bulk actions
- **spec_ref**: `#requirement-actionsfrom-renders-the-listed-actions-on-a-surface`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`
- [ ] Test, implement, docs, en/nl

### Task 5: Macros widget over the list
- **spec_ref**: `#requirement-the-macros-widget-is-a-view-over-the-same-list`
- **files**: `src/components/CnMacrosWidget/CnMacrosWidget.vue`
- [ ] Test, implement, docs, en/nl
