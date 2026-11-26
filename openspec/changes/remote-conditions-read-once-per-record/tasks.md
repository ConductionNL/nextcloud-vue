# Tasks: remote-conditions-read-once-per-record

## Implementation Tasks

### Task 1: A condition's remote read can be remembered
- **spec_ref**: `openspec/changes/remote-conditions-read-once-per-record/specs/action-buttons/spec.md#requirement-a-header-actions-remote-conditions-are-read-once-per-record`
- **files**: `src/utils/visibleWhen.js`
- [x] Implement: `rememberedRead()` behind the endpoint and source modes, keyed by the prefixed url in `ctx.remoteReads`
- [x] Test: `tests/components/CnActionButtonsRemoteReadsOncePerRecord.spec.js` "asks again after a refused read"

### Task 2: The action bar reads once per record
- **spec_ref**: `openspec/changes/remote-conditions-read-once-per-record/specs/action-buttons/spec.md#requirement-a-header-actions-remote-conditions-are-read-once-per-record`
- **files**: `src/components/CnActionButtons/CnActionButtons.vue`
- [x] Implement: `remoteReadsForRecord()` keyed by the record without its lock and the action list; `onActionClick()` drops the map
- [x] Test: same spec file, the three other cases (control: the first reads 3 times on the old source)

### Task 3: Live
- [ ] Measure the dossiq Edit case dialog open: `/lifecycle` asked once (runs with the consuming app's live pass)
