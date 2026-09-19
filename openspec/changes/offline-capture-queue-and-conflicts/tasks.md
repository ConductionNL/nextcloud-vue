# Tasks: offline-capture-queue-and-conflicts

> The field-inspection leaf gains a readable queue, a recorded conflict and a shell that opens offline (ADR-032 `kind: code`).
> Checkbox budget: 6 tasks x 2 = 12 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: `CnOfflineQueue`, the queue as a list
- **spec_ref**: `openspec/changes/offline-capture-queue-and-conflicts/specs/offline-field-capture/spec.md#requirement-the-queued-work-is-listed-not-counted`
- **files**: `src/components/CnOfflineQueue/CnOfflineQueue.vue`, `src/components/CnOfflineQueue/index.js`, `src/components/index.js`, `src/index.js`, `tests/components/CnOfflineQueue.spec.js`
- **acceptance_criteria**:
  - One row per queued mutation, naming operation, target, queued time, status, attempts and the last server error
  - An empty queue renders an empty state, not a blank panel
  - The list reads the existing `mutationQueue` indexes and adds no table
  - Rows refresh while a drain is running
- [x] Implement
- [x] Test

### Task 2: The leaf renders the queue
- **spec_ref**: `openspec/changes/offline-capture-queue-and-conflicts/specs/offline-field-capture/spec.md#requirement-the-queued-work-is-listed-not-counted`
- **files**: `src/integrations/builtin/field-inspection/CnFieldInspectionTab.vue`, `src/integrations/builtin/field-inspection/CnFieldInspectionCard.vue`, `tests/integrations/offline/leafQueueSurface.spec.js`
- **acceptance_criteria**:
  - The tab renders `CnOfflineQueue` under the planning, the card links to it
  - The pending count stays, as a summary of the list rather than instead of it
  - The indicator states keep their current meaning and their current colours
  - No existing prop, event or slot changes
- [x] Implement
- [x] Test

### Task 3: A conflict is written to the register
- **spec_ref**: `openspec/changes/offline-capture-queue-and-conflicts/specs/offline-field-capture/spec.md#requirement-a-conflict-is-written-to-the-register-not-kept-on-the-device`
- **files**: `src/integrations/offline/syncReplayService.js`, `src/integrations/offline/offlineDb.js`, `src/integrations/builtin/field-inspection.js`, `tests/integrations/offline/conflictRecording.spec.js`
- **acceptance_criteria**:
  - A classified conflict writes an object to `offlineConfig.conflictSchema` with the queue reference, the type, the client version and the server version
  - The conflict write is queued, and a retry writes it once, not twice
  - No configured schema means no write, and the row says the conflict is local to this device
  - `offlineConfig` gains `register`, `queueSchema` and `conflictSchema`, all optional
- [x] Implement
- [x] Test

### Task 4: Resolution from the queue
- **spec_ref**: `openspec/changes/offline-capture-queue-and-conflicts/specs/offline-field-capture/spec.md#requirement-a-conflict-is-resolved-from-the-queue-and-a-lost-permission-is-not-retried`
- **files**: `src/components/CnOfflineQueue/CnOfflineQueue.vue`, `src/integrations/offline/syncReplayService.js`, `tests/components/CnOfflineQueueResolution.spec.js`
- **acceptance_criteria**:
  - Keep mine, keep theirs and merge by hand each call `resolveConflictChoice` once with the matching resolution
  - A `permission_lost` row offers no resolution and says the right to write is gone
  - The resolution, the resolving user and the resolution time are written onto the conflict object
  - Keep theirs leaves the local cache holding the server's version
- [x] Implement
- [x] Test

### Task 5: A day of capture with no signal
- **spec_ref**: `openspec/changes/offline-capture-queue-and-conflicts/specs/offline-field-capture/spec.md#requirement-a-day-of-field-work-completes-with-no-signal`
- **files**: `src/integrations/builtin/field-inspection/CnFieldInspectionCard.vue`, `src/integrations/offline/offlineDb.js`, `tests/integrations/offline/offlineCapture.spec.js`
- **acceptance_criteria**:
  - A checklist and its evidence complete and enqueue with the browser reporting no connection
  - A reload with no connection loses nothing from the queue or the cached planning
  - A planning past its offline lifetime renders as out of date with its download time
  - The indicator reports queued work rather than an error while offline
- [x] Implement
- [x] Test

### Task 6: The worker, the helper and the handover
- **spec_ref**: `openspec/changes/offline-capture-queue-and-conflicts/specs/offline-field-capture/spec.md#requirement-the-shell-opens-with-no-signal-when-the-host-opts-in`
- **files**: `src/offline/serviceWorker.js`, `src/offline/registerOfflineWorker.js`, `src/index.js`, `docs/components/cn-offline-queue.md`, `tests/offline/registerOfflineWorker.spec.js`
- **acceptance_criteria**:
  - The helper registers only when the host calls it, and no-ops where the browser has no support
  - The worker serves the shell and the bundle from cache offline, and never an object read
  - A new bundle version replaces the cache rather than adding to it
  - The reference doc and the JSDoc name every new export, prop and `offlineConfig` key, and dossiq is told which schemas to name
- [x] Implement
- [x] Test
