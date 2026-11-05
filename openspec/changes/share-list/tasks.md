# Tasks: share-list

### Task 1: CnShareList
- **spec_ref**: `openspec/changes/share-list/specs/share-list/spec.md#requirement-a-card-lists-the-shares-of-a-record`
- **files**: `src/components/CnShareList/*`, `src/utils/widgetDispatch.js`, `src/utils/libraryWidgetKeys.js`, `src/components/CnWidgetGrid/registerDashboardWidgets.js`, `src/index.js`, `src/components/index.js`
- [x] Read the list, one row per share, kind icon, status pill, Copy link with a live announcement
- [x] Test: `tests/components/CnShareList.spec.js`

### Task 2: Revoke
- **spec_ref**: `openspec/changes/share-list/specs/share-list/spec.md#requirement-revoking-a-share-says-a-refusal-in-the-card`
- **files**: `src/components/CnShareList/CnShareList.vue`, `src/utils/cardNotices.js`
- [x] api-call with `noticeInline: 'error'`, read again when it lands
- [x] Test: `tests/components/CnShareList.spec.js`, `tests/utils/cardNoticesDispatch.spec.js`
