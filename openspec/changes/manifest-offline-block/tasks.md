# Tasks: manifest-offline-block

> Library half of buildiq `pages-installable-offline-and-mobile` (T07,
> D4, REQ-BQOM-003, REQ-BQOM-004); rows `pg-offline`,
> `pg-native-mobile` (buildiq). `kind: code`.
> Checkbox budget: 6 tasks x 2 = 12 unindented `- [ ]` lines (cap 20).

## Implementation tasks

### Task 1: The `offline` block
- **spec_ref**: `openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-the-manifest-declares-what-goes-offline`
- **files**: `src/schemas/app-manifest-v2.schema.json`, `src/utils/validateManifest.js`, `tests/utils/validateManifestOffline.spec.js`
- **acceptance_criteria**:
  - The block validates with the caps; each refusal of design D1 and D2 fails with a message naming the entry or page
  - Verify: jest; `npm run build:validators` leaves no diff
- [ ] Implement
- [ ] Test

### Task 2: Take-along module and scoped clear
- **spec_ref**: `openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-the-offline-core-downloads-reads-and-clears-a-take-along-set`
- **files**: `src/integrations/offline/takeAlong.js`, `src/integrations/offline/offlineDb.js`, `src/integrations/offline/index.js`, `tests/integrations/offline/takeAlong.spec.js`
- **acceptance_criteria**:
  - Download resolves tokens, honours `limit` and stores under `take-along` with the expiry; read returns no rows once expired
  - `clearCollection` removes one set and its meta row and leaves other sets and the queue
  - Verify: jest with fake-indexeddb through `__setDexie`
- [ ] Implement
- [ ] Test

### Task 3: Offline index and detail pages
- **spec_ref**: `openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-index-and-detail-pages-read-from-the-device-when-offline`
- **files**: `src/composables/useOfflineTakeAlong.js`, `src/components/CnIndexPage/CnIndexPage.vue`, `src/components/CnDetailPage/CnDetailPage.vue`, `tests/components/CnIndexPageOffline.spec.js`, `tests/components/CnDetailPageOffline.spec.js`
- **acceptance_criteria**:
  - Offline with a set: rows, status bar, local search and sort; detail opens from the set with writes disabled
  - Expired set shows the sentence; a manifest without `offline` never calls `openDb`
  - Verify: jest; mutation check: removing the expiry check reddens the expired test
- [ ] Implement
- [ ] Test

### Task 4: Offline form submission
- **spec_ref**: `openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-an-offline-form-queues-its-submission-and-the-root-sends-it`
- **files**: `src/components/CnFormPage/CnFormPage.vue`, `tests/components/CnFormPageOffline.spec.js`
- **acceptance_criteria**:
  - Offline submit of a listed form calls `enqueueMutation` with device id, register, schema, operation and payload, shows the sentence and emits `queued`
  - A form not listed behaves as today; file fields are disabled offline
  - Verify: jest
- [ ] Implement
- [ ] Test

### Task 5: The root drains its own queue
- **spec_ref**: `openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-an-offline-form-queues-its-submission-and-the-root-sends-it`
- **files**: `src/integrations/offline/syncReplayService.js`, `src/components/CnAppRoot/CnAppRoot.vue`, `tests/integrations/offline/drainFilter.spec.js`, `tests/components/CnAppRootOffline.spec.js`
- **acceptance_criteria**:
  - `drainQueue` with a `filter` replays only matching rows, in the same order
  - The root drains on mount when online and on `online`, only for its offline forms' pairs
  - Verify: jest
- [ ] Implement
- [ ] Test

### Task 6: Docs and an end-to-end check
- **spec_ref**: `openspec/changes/manifest-offline-block/specs/manifest-offline/spec.md#requirement-index-and-detail-pages-read-from-the-device-when-offline`
- **files**: `docs/integrations/offline-manifest.md`, `e2e/manifest-offline.e2e.js`
- **acceptance_criteria**:
  - Docs show the block, the form rule of design D2 and what the host still does (worker, when to download, clearing)
  - A harness page downloads a set, goes offline, lists and opens a record with its time, submits an offline form, goes online and sees it arrive
  - Verify: `npm run check:docs`, `npm run check:docs-fresh`, `npm run test:e2e -- manifest-offline`
- [ ] Implement
- [ ] Test
