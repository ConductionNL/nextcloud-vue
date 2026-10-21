# Tasks: record-list-footer-action

### Task 1: An action under the list
- **spec_ref**: `openspec/changes/record-list-footer-action/specs/record-list/spec.md#requirement-a-record-list-can-end-with-an-action-that-says-why-it-is-disabled`
- **files**: `src/components/CnRecordListWidget/CnRecordListWidget.vue`
- [x] Implement: `footerAction` with `disabledWhen` and `disabledReason`
- [x] Test: `tests/components/CnRecordListWidgetFooterAction.spec.js`

### Task 2: anyOf
- **spec_ref**: `openspec/changes/record-list-footer-action/specs/record-list/spec.md#requirement-a-visiblewhen-condition-can-match-any-of-a-list`
- **files**: `src/utils/visibleWhen.js`
- [x] Implement: the `anyOf` operator
- [x] Test: `tests/utils/visibleWhenAnyOf.spec.js`
