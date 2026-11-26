# Tasks: detail-header-row-from-record

### Task 1: A record names its header row and primary action
- **spec_ref**: `openspec/changes/detail-header-row-from-record/specs/detail-page/spec.md#requirement-a-record-can-name-its-primary-action`
- **files**: `src/components/CnDetailPage/CnDetailPage.vue`, `src/schemas/app-manifest-v2.schema.json`, docs
- [x] Implement: `primaryActionFrom`, `recordPrimary`, `stagePrimary` takes it while visible
- [x] Implement: `quickActionsFrom` takes a list of paths, first match wins
- [x] Test: `tests/components/CnDetailPageHeaderRowFromRecord.spec.js`
