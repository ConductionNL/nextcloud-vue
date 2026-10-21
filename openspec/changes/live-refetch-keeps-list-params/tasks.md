# Tasks: live-refetch-keeps-list-params

### Task 1: A live refetch repeats the list's last query
- **spec_ref**: `openspec/changes/live-refetch-keeps-list-params/specs/live-refetch-keeps-list-params/spec.md#requirement-a-live-refetch-repeats-the-lists-last-query`
- **files**: `src/store/plugins/liveUpdates.js`, `src/store/plugins/logs.js`
- [x] Implement: register both `$onAction` observers detached
- [x] Test: `tests/store/plugins/liveUpdatesStashOutlivesScope.spec.js`
