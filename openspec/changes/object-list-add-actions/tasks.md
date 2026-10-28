# Tasks: object-list-add-actions

### Task 1: Extra adds
- **spec_ref**: `openspec/changes/object-list-add-actions/specs/object-list/spec.md#requirement-a-list-can-offer-more-than-one-add`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`, `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`, `src/utils/listCreateAction.js`
- [x] Implement: `content.addActions`, `openCreateWith`
- [x] Test: `tests/components/CnObjectListWidgetAddActions.spec.js`, `tests/components/CnDetailWidgetHostAddActions.spec.js`

### Task 2: Totals
- **spec_ref**: `openspec/changes/object-list-add-actions/specs/object-list/spec.md#requirement-a-list-can-end-in-the-totals-of-the-record-it-sits-on`
- **files**: `src/components/CnObjectListWidget/CnObjectListWidget.vue`, `l10n/en.json`, `l10n/nl.json`
- [x] Implement: `content.totals`
- [x] Test: `tests/components/CnObjectListWidgetTotals.spec.js`
