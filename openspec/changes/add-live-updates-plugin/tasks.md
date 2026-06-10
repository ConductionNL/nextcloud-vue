# Tasks: add-live-updates-plugin

## 1. Add runtime dependencies

### Task 1.1: Add @nextcloud/notify_push to package.json

- **spec_ref**: `specs/store/spec.md` — REQ-ST-LU-001, REQ-ST-LU-005 (transport deps)
- **files**: `package.json`
- **acceptance_criteria**:
  - GIVEN `package.json` THEN `"@nextcloud/notify_push": "^2.0.0"` is listed under `dependencies`
  - GIVEN `package.json` THEN `"@vueuse/core": "^10.0.0"` is listed under `peerDependencies`
  - GIVEN `npm ci` THEN no install errors
- [ ] 1.1 Add `@nextcloud/notify_push` to `dependencies` and `@vueuse/core` to `peerDependencies` in `package.json`

---

## 2. Create event key constants

### Task 2.1: Create eventKeys.js

- **spec_ref**: `specs/store/spec.md` — REQ-ST-LU-002 (event key format must match OR backend)
- **files**: `src/store/liveUpdates/eventKeys.js`
- **acceptance_criteria**:
  - GIVEN the file THEN `OR_OBJECT` equals `'or-object'`
  - GIVEN the file THEN `OR_COLLECTION` equals `'or-collection'`
  - GIVEN `buildObjectKey('uuid-abc')` THEN returns `'or-object-uuid-abc'`
  - GIVEN `buildCollectionKey('zaken', 'meldingen')` THEN returns `'or-collection-zaken-meldingen'`
- [ ] 2.1 Create `src/store/liveUpdates/eventKeys.js` with constants and builder functions

---

## 3. Create WebSocket transport

### Task 3.1: Implement websocketTransport.js

- **spec_ref**: `specs/store/spec.md` — REQ-ST-LU-001 (singleton), REQ-ST-LU-003 (refcounted listeners), REQ-ST-LU-006 (reconnect with jitter)
- **files**: `src/store/liveUpdates/websocketTransport.js`
- **acceptance_criteria**:
  - GIVEN `listen()` from `@nextcloud/notify_push` returns a function THEN WebSocket is established
  - GIVEN multiple calls to `subscribe(eventKey, cb)` on the same key THEN `listen()` is called once for that key
  - GIVEN last subscriber unsubscribes for a key THEN the underlying listener is removed
  - GIVEN WebSocket disconnects THEN reconnect uses backoff + jitter (`min(1000 × 2^n, 30000) + random × backoff`)
  - GIVEN reconnect succeeds THEN all active event keys re-attach and status changes to `'live'`
  - GIVEN reconnect fails 5 consecutive times THEN transport emits `'polling'` status
  - GIVEN `onStatusChange(cb)` registered THEN `cb` is called on every status transition
- [ ] 3.1 Create `src/store/liveUpdates/websocketTransport.js` with singleton state, refcounted listener map, and reconnect backoff

---

## 4. Create polling transport

### Task 4.1: Implement pollingTransport.js

- **spec_ref**: `specs/store/spec.md` — REQ-ST-LU-005 (polling fallback, visibility gate, coalesced interval)
- **files**: `src/store/liveUpdates/pollingTransport.js`
- **acceptance_criteria**:
  - GIVEN `subscribe(eventKey, cb, interval)` THEN one `setInterval` per unique key
  - GIVEN multiple subscribers to the same key THEN one interval (coalesced refcount)
  - GIVEN `document.visibilityState === 'hidden'` THEN interval callbacks are skipped
  - GIVEN visibility changes to `'visible'` THEN one immediate callback fires then interval resets
  - GIVEN last subscriber unsubscribes for a key THEN `clearInterval` is called
- [ ] 4.1 Create `src/store/liveUpdates/pollingTransport.js` with refcounted intervals and `visibilitychange` listener

---

## 5. Create transport singleton

### Task 5.1: Implement transport.js

- **spec_ref**: `specs/store/spec.md` — REQ-ST-LU-001 (singleton), REQ-ST-LU-005 (fallback routing)
- **files**: `src/store/liveUpdates/transport.js`
- **acceptance_criteria**:
  - GIVEN `getLiveUpdates()` called multiple times THEN same object reference returned
  - GIVEN `@nextcloud/notify_push` `listen()` returns `null` THEN `pollingTransport` is used and status is `'polling'`
  - GIVEN `@nextcloud/notify_push` `listen()` returns a function THEN `websocketTransport` is used
  - GIVEN `subscribe(eventKey, cb, opts)` THEN routes to the active transport
  - GIVEN `unsubscribe(handle)` THEN routes to the active transport
  - GIVEN `onStatusChange(cb)` THEN proxies to active transport status observer
- [ ] 5.1 Create `src/store/liveUpdates/transport.js` implementing `getLiveUpdates()` factory with transport selection and status observer

---

## 6. Create the liveUpdatesPlugin

### Task 6.1: Implement liveUpdates.js plugin factory

- **spec_ref**: `specs/store/spec.md` — REQ-ST-LU-001 through REQ-ST-LU-008
- **files**: `src/store/plugins/liveUpdates.js`
- **acceptance_criteria**:
  - GIVEN `liveUpdatesPlugin()` THEN returns a plugin with `name: 'liveUpdates'`
  - GIVEN plugin registered THEN state includes `liveStatus`, `liveSubscriptions`, `liveLastEventAt`
  - GIVEN plugin registered THEN getters include `getLiveStatus`, `getLiveSubscriptions`, `getLiveLastEventAt`
  - GIVEN plugin registered THEN actions include `subscribe(type, id?)` and `unsubscribe(handle)`
  - GIVEN `subscribe('melding', 'uuid-abc')` THEN subscribes to `'or-object-uuid-abc'` and increments `liveSubscriptions`
  - GIVEN `subscribe('melding')` THEN derives event key from `objectTypeRegistry` and subscribes to `'or-collection-{register}-{schema}'`
  - GIVEN event arrives on `or-object-{uuid}` THEN `fetchObject(type, id)` is called (deduplicated)
  - GIVEN event arrives on `or-collection-{r}-{s}` THEN `fetchCollection(type, lastParams)` is called (deduplicated)
  - GIVEN `unsubscribe(handle)` THEN decrements `liveSubscriptions` and tears down underlying listener when refcount hits 0
  - GIVEN `tryOnScopeDispose` is available THEN auto-registers cleanup on subscribe
  - GIVEN `subscribe('unknown')` THEN throws with message including `"unknown" is not registered`
  - GIVEN plugin options `{ pollIntervalCollection: 15000, pollIntervalObject: 45000 }` THEN passed to polling transport
- **setup hook**:
  - GIVEN `setup(store)` called THEN `store.$onAction` intercepts `fetchCollection` to stash last params per type
  - GIVEN `onStatusChange` registered THEN `store.liveStatus` updates when transport status changes
- [ ] 6.1 Create `src/store/plugins/liveUpdates.js` implementing the full plugin factory

---

## 7. Add in-flight fetch deduplication

### Task 7.1: Augment fetchObject and fetchCollection with dedup

- **spec_ref**: `specs/store/spec.md` — REQ-ST-LU-004 (in-flight dedup)
- **files**: `src/store/plugins/liveUpdates.js`
- **acceptance_criteria**:
  - GIVEN `fetchObject('melding', 'uuid-abc')` called three times simultaneously THEN one HTTP request made
  - GIVEN the promise settles THEN the dedup cache entry is removed
  - GIVEN the promise rejects THEN the dedup cache entry is removed and retry is possible
  - GIVEN `fetchCollection('melding', params)` called concurrently THEN deduplicated by `type:hash(params)` key
  - GIVEN two different IDs (`'uuid-abc'` and `'uuid-xyz'`) fetched simultaneously THEN two requests made
- **implementation note**: dedup state is a plain JS `Map` attached in `setup()` — NOT reactive Pinia state
- [ ] 7.1 Add dedup Maps to liveUpdatesPlugin `setup()` hook; wrap `fetchObject` and `fetchCollection` store actions to check/populate the maps before making HTTP calls

---

## 8. Wire plugin into the plugin index

### Task 8.1: Export liveUpdatesPlugin from plugins/index.js

- **spec_ref**: `specs/store/spec.md` — REQ-ST-LU-001 (plugin registration pattern)
- **files**: `src/store/plugins/index.js`, `src/store/index.js`, `src/index.js`
- **acceptance_criteria**:
  - GIVEN `import { liveUpdatesPlugin } from '@conduction/nextcloud-vue'` THEN the plugin is available
  - GIVEN the barrel export chain THEN `liveUpdatesPlugin` is re-exported from `src/store/plugins/index.js`, `src/store/index.js`, and `src/index.js`
- [ ] 8.1 Add `export { liveUpdatesPlugin } from './liveUpdates.js'` to `src/store/plugins/index.js`; re-export through `src/store/index.js` and `src/index.js`

---

## 9. Update store canonical spec

### Task 9.1: Add OpenSpec changes reference line to store spec

- **spec_ref**: `openspec/specs/store/spec.md`
- **files**: `openspec/specs/store/spec.md`
- **acceptance_criteria**:
  - GIVEN `openspec/specs/store/spec.md` THEN near the top it contains: `**OpenSpec changes**: add-live-updates-plugin (in-progress — adds notify_push subscription transport)`
- [ ] 9.1 Add the `**OpenSpec changes**` line to `openspec/specs/store/spec.md` near the Purpose section

---

## 10. Write unit tests

### Task 10.1: Unit tests for eventKeys.js

- **spec_ref**: `specs/store/spec.md` — REQ-ST-LU-002 (event key format)
- **files**: `src/store/liveUpdates/__tests__/eventKeys.test.js`
- **acceptance_criteria**:
  - GIVEN `buildObjectKey('uuid-abc')` THEN returns `'or-object-uuid-abc'`
  - GIVEN `buildCollectionKey('zaken', 'meldingen')` THEN returns `'or-collection-zaken-meldingen'`
- [ ] 10.1 Create unit tests for eventKeys module

### Task 10.2: Unit tests for liveUpdatesPlugin

- **spec_ref**: `specs/store/spec.md` — REQ-ST-LU-002 through REQ-ST-LU-008
- **files**: `src/store/plugins/__tests__/liveUpdates.test.js`
- **acceptance_criteria**:
  - GIVEN `subscribe('melding', 'uuid-abc')` THEN `liveSubscriptions === 1`
  - GIVEN `subscribe` called for unregistered type THEN throws
  - GIVEN `unsubscribe(handle)` THEN `liveSubscriptions` decrements
  - GIVEN two simultaneous `fetchObject` calls for same ID THEN one HTTP request (mock fetch, check call count)
  - GIVEN transport emits status change THEN `liveStatus` updates in Pinia state
  - GIVEN `subscribe('melding')` THEN derived event key matches `or-collection-{register}-{schema}`
- [ ] 10.2 Create unit tests for liveUpdatesPlugin covering subscribe, unsubscribe, dedup, and status transitions

---

## Verification

- [ ] `npm run build` succeeds
- [ ] `npm test` passes (all unit tests)
- [ ] `npm run lint` passes
- [ ] `import { liveUpdatesPlugin } from '@conduction/nextcloud-vue'` resolves correctly from built dist
- [ ] Barrel export chain confirmed: `liveUpdatesPlugin` accessible from `src/index.js`
- [ ] `store.liveStatus`, `store.liveSubscriptions`, `store.liveLastEventAt` are reactive (verified in unit tests)
- [ ] `openspec/specs/store/spec.md` contains the `**OpenSpec changes**` reference line
- [ ] No hardcoded event key strings outside `eventKeys.js`
- [ ] No direct references to `@nextcloud/notify_push` outside `websocketTransport.js` and `transport.js`
