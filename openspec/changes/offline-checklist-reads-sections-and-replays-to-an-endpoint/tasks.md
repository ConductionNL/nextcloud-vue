# Tasks: offline-checklist-reads-sections-and-replays-to-an-endpoint

### Task 1: Read the template through the config
- **spec_ref**: `openspec/changes/offline-checklist-reads-sections-and-replays-to-an-endpoint/specs/offline-field-capture/spec.md#requirement-the-checklist-template-is-read-through-the-leafs-config`
- **files**: `src/integrations/offline/fieldCollectionHelpers.js`, `src/integrations/builtin/field-inspection.js`, `src/integrations/builtin/field-inspection/CnFieldInspectionCard.vue`, `tests/integrations/offline/fieldCollectionHelpers.spec.js`, `tests/integrations/offline/offlineCapture.spec.js`
- [x] Implement
- [x] Test

### Task 2: Replay a finished run to a configured endpoint
- **spec_ref**: `openspec/changes/offline-checklist-reads-sections-and-replays-to-an-endpoint/specs/offline-field-capture/spec.md#requirement-a-finished-run-can-replay-to-an-apps-own-endpoint`
- **files**: `src/integrations/offline/checklistSubmission.js`, `src/integrations/offline/offlineDb.js`, `src/integrations/offline/syncReplayService.js`, `src/integrations/offline/index.js`, `tests/integrations/offline/checklistSubmission.spec.js`, `tests/integrations/offline/planningAndReplay.spec.js`, `docs/utilities/default-field-inspection-config.md`
- [x] Implement
- [x] Test
