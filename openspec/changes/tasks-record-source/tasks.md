# Tasks: tasks-record-source

### Task 1: The tasks source reads one task
- **spec_ref**: `openspec/changes/tasks-record-source/specs/tasks-record-source/spec.md#requirement-the-tasks-source-reads-one-task`
- **files**: `src/composables/useTaskInboxStore.js`, `src/composables/indexSources.js`
- [x] Implement: `fetchRecord` with `records` and `recordErrors`; `loadRecord`, `record`, `recordError` on the source; one `taskRow` for list and record
- [x] Test: `tests/composables/tasksRecordSource.spec.js`
