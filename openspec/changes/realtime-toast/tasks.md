# Tasks: realtime-toast

### Task 1: CnRealtimeToast
- **spec_ref**: `openspec/changes/realtime-toast/specs/realtime-toast/spec.md#requirement-a-change-by-someone-else-shows-a-toast`
- **files**: `src/components/CnRealtimeToast/*`, `src/index.js`, `src/components/index.js`
- [x] Poll with since, or a channel; ignore the reader's own change; close; page refresh
- [x] Test: `tests/components/CnRealtimeToast.spec.js`

### Task 2: On the index page
- **spec_ref**: `openspec/changes/realtime-toast/specs/realtime-toast/spec.md#requirement-an-index-page-follows-changes-live`
- **files**: `src/components/CnIndexPage/CnIndexPage.vue`
- [x] `realtime` prop, per view
- [x] Test: `tests/components/CnRealtimeToast.spec.js`
