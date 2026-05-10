---
status: proposed
---

# Store — Live Updates Delta Spec

**OpenSpec changes**: `add-live-updates-plugin` (in-progress — adds notify_push subscription transport)

**Cross-references**: [store main spec](../../../../specs/store/spec.md), [OR realtime-updates delta](../../../../../../openregister/openspec/changes/add-live-updates/specs/realtime-updates/spec.md), ADR-004 (frontend conventions), ADR-015 (common patterns).

## Purpose of this delta

Extends the `store` capability with live-update subscription support. The existing spec (`REQ-ST-001` through `REQ-ST-015`) remains unchanged. This delta adds requirements `REQ-ST-LU-001` through `REQ-ST-LU-008` that specify the `liveUpdatesPlugin`, its `subscribe`/`unsubscribe` actions, in-flight fetch deduplication, the polling fallback transport, and diagnostic state.

The backend counterpart (OR `NotifyPushListener`, event strings `or-object-{uuid}` and `or-collection-{register-slug}-{schema-slug}`, per-user fan-out, batch mode) is specified in the OR `add-live-updates` delta spec and PR #1453. Event string formats defined there are normative here.

---

## MODIFIED Requirements

### Requirement: REQ-ST-001 — Object Type Registration (extended with slugs)

The existing `registerObjectType(slug, schemaUuid, registerUuid)` signature MUST be extended to accept an optional fourth argument carrying the canonical OR slugs:

```js
store.registerObjectType('melding', schemaUuid, registerUuid, { registerSlug: 'zaken', schemaSlug: 'meldingen' })
```

When the optional argument is omitted, behaviour MUST be backwards-compatible with the existing signature — slug fields default to `null` in `objectTypeRegistry[slug]` and the live-updates plugin lazy-fetches them on first `subscribe()` call (see REQ-ST-LU-002 and REQ-ST-LU-009 below).

#### Scenario: Register with slugs

- GIVEN a store and OR slugs known at registration time
- WHEN `store.registerObjectType('melding', 'schema-uuid', 'register-uuid', { registerSlug: 'zaken', schemaSlug: 'meldingen' })` is called
- THEN `store.objectTypeRegistry.melding` MUST contain `{ schema: 'schema-uuid', register: 'register-uuid', registerSlug: 'zaken', schemaSlug: 'meldingen' }`
- AND collection-event subscription via `store.subscribe('melding')` MUST NOT trigger a slug lookup (slugs already cached)

#### Scenario: Register without slugs (back-compat)

- GIVEN existing consumer code calls `store.registerObjectType('melding', 'schema-uuid', 'register-uuid')` (three-arg form)
- THEN `store.objectTypeRegistry.melding` MUST contain `{ schema: 'schema-uuid', register: 'register-uuid', registerSlug: null, schemaSlug: null }`
- AND no error MUST be thrown
- AND existing consumer apps MUST continue to function without modification

---

## ADDED Requirements

### Requirement: REQ-ST-LU-001 — `useLiveUpdates` singleton plugin

A single transport connection MUST exist per browser tab regardless of how many store instances or components call `store.subscribe()`. `getLiveUpdates()` is a module-level factory that returns the same instance on every call. The instance is constructed lazily on the first `subscribe()` call.

#### Scenario: Singleton across multiple store instances

- GIVEN `createObjectStore('store-a', { plugins: [liveUpdatesPlugin()] })` and `createObjectStore('store-b', { plugins: [liveUpdatesPlugin()] })` both return stores
- WHEN `storeA.subscribe('lead')` and `storeB.subscribe('case')` are both called
- THEN `getLiveUpdates()` MUST return the same object reference from both calls
- AND only one WebSocket connection to the Nextcloud push server MUST be established

#### Scenario: Lazy construction on first subscribe

- GIVEN no component has called `store.subscribe()` yet
- WHEN the store is initialized
- THEN no WebSocket connection MUST be opened
- AND `getLiveUpdates()` MUST return `null` until first subscribe or return the singleton lazily

#### Scenario: Status reflects connection lifecycle

- GIVEN a store with `liveUpdatesPlugin()` registered
- WHEN `store.subscribe('lead')` is called for the first time
- THEN `store.liveStatus` MUST transition from `'offline'` to `'connecting'` immediately
- AND upon successful WebSocket connection, MUST transition to `'live'`
- AND upon fallback activation, MUST transition to `'polling'`

#### Scenario: Plugin registration via createObjectStore

- WHEN `const useMyStore = createObjectStore('my-store', { plugins: [liveUpdatesPlugin()] })` is called
- THEN the resulting store MUST expose `subscribe`, `unsubscribe`, `liveStatus`, `liveSubscriptions`, `liveLastEventAt`
- AND calling `useObjectStore()` (the default store, without the plugin) MUST NOT expose those properties

---

### Requirement: REQ-ST-LU-002 — `store.subscribe(type, id?)` action

The store MUST expose a `subscribe(type, id?)` action that subscribes to live updates for an object type and optional ID. When `id` is provided, the subscription MUST target `or-object-{id}` (per-object events). When omitted, the subscription MUST target `or-collection-{registerSlug}-{schemaSlug}` derived from `objectTypeRegistry[type]`. The method MUST return an opaque handle that the caller passes to `unsubscribe()`. When called inside a Vue component lifecycle (setup or Options API `mounted`), `tryOnScopeDispose` MUST auto-register cleanup so the subscription is torn down when the component unmounts.

#### Scenario: Object subscription with ID

- GIVEN `'melding'` is registered with register slug `'zaken'` and schema slug `'meldingen'`
- WHEN `const handle = store.subscribe('melding', 'uuid-abc')` is called
- THEN the transport MUST subscribe to event key `'or-object-uuid-abc'`
- AND `handle` MUST be a non-null value usable in a subsequent `unsubscribe(handle)` call
- AND `store.liveSubscriptions` MUST increment by 1

#### Scenario: Collection subscription without ID

- GIVEN `'melding'` is registered with register `{ slug: 'zaken' }` and schema `{ slug: 'meldingen' }`
- WHEN `const handle = store.subscribe('melding')` is called
- THEN the transport MUST subscribe to event key `'or-collection-zaken-meldingen'`
- AND `store.liveSubscriptions` MUST increment by 1

#### Scenario: Auto-cleanup via scope dispose

- GIVEN `store.subscribe('melding', 'uuid-abc')` is called inside a Vue component `mounted()` hook (Options API)
- WHEN the component is destroyed (`beforeDestroy`)
- THEN the subscription MUST be cleaned up automatically via `tryOnScopeDispose`
- AND `store.liveSubscriptions` MUST decrement by 1

#### Scenario: Subscribe to unregistered type throws

- GIVEN `'unknown'` has NOT been registered via `registerObjectType`
- WHEN `store.subscribe('unknown')` is called
- THEN it MUST throw an `Error` with a message including `"unknown" is not registered`

---

### Requirement: REQ-ST-LU-003 — Refcounted listener fan-in

Multiple components subscribing to the same event key MUST share one underlying transport listener. The plugin MUST maintain an internal `Map<eventKey, Set<callback>>` that tracks all callbacks per key. When the last `unsubscribe()` for a key fires, the underlying transport listener for that key MUST be torn down. Other event keys MUST remain active.

#### Scenario: Multiple subscribers share one transport listener

- GIVEN three components each call `store.subscribe('melding', 'uuid-abc')` independently
- WHEN the transport receives `or-object-uuid-abc`
- THEN the transport MUST call the underlying notify_push `listen()` function exactly once for `'or-object-uuid-abc'`
- AND all three components' `fetchObject` triggers MUST fire (via the plugin's internal fan-out)

#### Scenario: Last unsubscribe tears down the key's listener

- GIVEN three components subscribed to the same event key via handles `h1`, `h2`, `h3`
- WHEN `store.unsubscribe(h1)` and `store.unsubscribe(h2)` are called
- THEN the transport listener for that key MUST remain active
- WHEN `store.unsubscribe(h3)` is called
- THEN the transport listener for that key MUST be removed
- AND other subscribed keys MUST remain unaffected

#### Scenario: Unrelated keys are independent

- GIVEN `store.subscribe('melding', 'uuid-a')` and `store.subscribe('melding', 'uuid-b')` are active
- WHEN `store.unsubscribe` removes the `uuid-a` subscription
- THEN the `or-object-uuid-b` listener MUST remain active and functional

---

### Requirement: REQ-ST-LU-004 — In-flight fetch deduplication

When multiple components subscribe to the same event key and an event fires, the store MUST issue exactly one HTTP fetch (one `fetchObject` or `fetchCollection` call). Concurrent callers for the same `(type, id)` object fetch or `(type, paramsHash)` collection fetch receive the same Promise. The dedup cache is cleared as soon as the Promise settles (resolve or reject).

#### Scenario: Five subscribers, one fetch on event burst

- GIVEN five components subscribe to `'or-object-uuid-abc'`
- WHEN the event `or-object-uuid-abc` fires once
- THEN `fetchObject('melding', 'uuid-abc')` MUST be called exactly once
- AND all five components MUST receive the updated data reactively via `store.objects.melding['uuid-abc']`

#### Scenario: Concurrent direct fetchObject calls are also deduplicated

- GIVEN no active subscription
- WHEN three application actions call `store.fetchObject('melding', 'uuid-abc')` simultaneously (within the same microtask burst)
- THEN exactly one HTTP GET request MUST be made
- AND all three callers MUST receive the same resolved value

#### Scenario: Dedup cache cleared on settle

- GIVEN a `fetchObject('melding', 'uuid-abc')` is in-flight
- WHEN the fetch resolves
- THEN the dedup cache entry for `'melding:uuid-abc'` MUST be removed
- AND a subsequent call to `fetchObject('melding', 'uuid-abc')` MUST issue a new HTTP request

#### Scenario: Failed fetch clears dedup entry

- GIVEN a `fetchObject('melding', 'uuid-abc')` is in-flight and the server returns 500
- WHEN the fetch rejects
- THEN the dedup cache entry MUST be removed
- AND subsequent calls MUST be able to retry

---

### Requirement: REQ-ST-LU-005 — Polling fallback transport

When `@nextcloud/notify_push` is unavailable (the `listen()` function returns `null` or the WebSocket connection fails after initial connect), `store.subscribe()` MUST silently route through a polling fallback. One coalesced `setInterval` per unique subscription key runs at a configurable interval (default 30s for collections, 60s for objects). Polling is suspended when `document.visibilityState === 'hidden'` and resumes on `visibilitychange`.

#### Scenario: Automatic fallback when notify_push unavailable

- GIVEN `@nextcloud/notify_push` returns `null` from `listen()`
- WHEN `store.subscribe('melding')` is called
- THEN `store.liveStatus` MUST equal `'polling'`
- AND `store.fetchCollection('melding', lastParams)` MUST be called on the configured interval
- AND no error or warning MUST appear in the console

#### Scenario: Polling pauses for hidden tabs

- GIVEN a collection subscription is active in polling mode
- WHEN `document.visibilityState` changes to `'hidden'`
- THEN polling MUST pause (no fetch calls while hidden)
- WHEN `document.visibilityState` changes to `'visible'`
- THEN polling MUST resume immediately (one fetch fires, then interval resets)

#### Scenario: Coalesced interval for multiple subscribers

- GIVEN five components subscribe to `'melding'` (no ID, same collection)
- WHEN in polling fallback mode
- THEN exactly one `setInterval` MUST run for that subscription key
- AND when all five unsubscribe, the interval MUST be cleared

#### Scenario: Configurable poll intervals

- GIVEN `liveUpdatesPlugin({ pollIntervalCollection: 15000, pollIntervalObject: 45000 })` is used
- WHEN a collection subscription is active in polling mode
- THEN `fetchCollection` MUST be called every 15 seconds
- WHEN an object subscription is active in polling mode
- THEN `fetchObject` MUST be called every 45 seconds

---

### Requirement: REQ-ST-LU-006 — Reconnect with jitter

When the notify_push WebSocket disconnects, the singleton MUST reconnect with exponential backoff plus jitter. On successful reconnect, every active subscription MUST re-attach to the socket. One round of refetches MUST be issued (each jittered 0–500ms independently) so reconnect cost is bounded.

#### Scenario: Exponential backoff on disconnect

- GIVEN the WebSocket disconnects after being `'live'`
- THEN `store.liveStatus` MUST transition to `'reconnecting'`
- AND the first reconnect attempt MUST wait approximately 1s (base) ± jitter
- AND if the second attempt also fails, the wait MUST be approximately 2s ± jitter
- AND subsequent attempts MUST cap at 30s

#### Scenario: All subscriptions re-attach on reconnect

- GIVEN 10 active subscriptions across different event keys
- WHEN the WebSocket reconnects successfully
- THEN all 10 event keys MUST be re-subscribed via `listen()` on the new connection
- AND `store.liveStatus` MUST return to `'live'`

#### Scenario: Refetch burst is jittered after reconnect

- GIVEN 20 active subscriptions when the WebSocket reconnects
- WHEN the reconnect succeeds
- THEN each subscription MUST trigger a refetch with an independent random delay in [0ms, 500ms]
- AND all 20 refetches MUST complete within 500ms + max HTTP latency
- AND dedup ensures at most one in-flight request per unique (type, id or params)

#### Scenario: Jitter formula

- GIVEN `backoff = min(base × 2^attempt, cap)` with `base=1000`, `cap=30000`, `multiplier=2`
- AND `delay = backoff + Math.random() × backoff`
- THEN after 5 failed attempts the delay MUST be in the range [16s, 32s] (cap applies at attempt 5)
- AND `delay` MUST never exceed 60s

---

### Requirement: REQ-ST-LU-007 — Refetch on event arrival

An incoming `or-object-{uuid}` event MUST trigger `store.fetchObject(type, id)` in the store that holds the subscription. An incoming `or-collection-{register}-{schema}` event MUST trigger `store.fetchCollection(type, lastParams)` where `lastParams` is the params object stashed by the most recent `fetchCollection(type, params)` call for that type. Refetch results land in the existing reactive `store.objects[type]` / `store.collections[type]` state so all Vue computed properties react automatically.

#### Scenario: Object event triggers fetchObject

- GIVEN `store.subscribe('melding', 'uuid-abc')` is active
- WHEN the transport receives `{ eventKey: 'or-object-uuid-abc', payload: { action: 'update', ... } }`
- THEN `store.fetchObject('melding', 'uuid-abc')` MUST be called
- AND the result MUST be stored in `store.objects.melding['uuid-abc']`
- AND `store.liveLastEventAt` MUST be updated to the current timestamp

#### Scenario: Collection event triggers fetchCollection with last params

- GIVEN `store.fetchCollection('melding', { _limit: 10, _search: 'gemeente' })` was called previously
- AND `store.subscribe('melding')` is active
- WHEN the transport receives `or-collection-zaken-meldingen`
- THEN `store.fetchCollection('melding', { _limit: 10, _search: 'gemeente' })` MUST be called (with stashed params)
- AND the result MUST land in `store.collections.melding`

#### Scenario: First collection event uses empty params when none stashed

- GIVEN `store.subscribe('melding')` is active but `fetchCollection` has not been called yet
- WHEN the transport receives `or-collection-zaken-meldingen`
- THEN `store.fetchCollection('melding', {})` MUST be called with an empty params object
- AND the result MUST land in `store.collections.melding`

#### Scenario: liveLastEventAt updates on each event

- GIVEN `store.subscribe('melding', 'uuid-abc')` is active
- WHEN three events arrive consecutively
- THEN `store.liveLastEventAt` MUST be a `Date` object with a timestamp close to `Date.now()` after each event

---

### Requirement: REQ-ST-LU-008 — Diagnostic state

The plugin MUST expose `store.liveStatus`, `store.liveSubscriptions`, and `store.liveLastEventAt` as reactive Pinia state accessible via getters. These properties MUST surface enough information for admin/debug UIs without exposing internal transport implementation details.

#### Scenario: liveStatus transitions

| From | To | Trigger |
|---|---|---|
| `'offline'` | `'connecting'` | First `subscribe()` call |
| `'connecting'` | `'live'` | WebSocket connected |
| `'connecting'` | `'polling'` | `listen()` returned `null` or connection timed out |
| `'live'` | `'reconnecting'` | WebSocket disconnected |
| `'reconnecting'` | `'live'` | WebSocket reconnected |
| `'reconnecting'` | `'polling'` | Reconnect attempts exhausted (after 5 consecutive failures) |

- GIVEN the store transitions through each lifecycle state
- THEN `store.liveStatus` MUST reflect the correct string at each step
- AND Vue computed properties depending on `store.liveStatus` MUST react without explicit watchers

#### Scenario: liveSubscriptions count

- GIVEN zero subscriptions active
- THEN `store.liveSubscriptions` MUST equal `0`
- WHEN `store.subscribe('melding', 'uuid-abc')` is called
- THEN `store.liveSubscriptions` MUST equal `1`
- WHEN a second `store.subscribe('melding', 'uuid-xyz')` is called
- THEN `store.liveSubscriptions` MUST equal `2`
- WHEN both are unsubscribed
- THEN `store.liveSubscriptions` MUST return to `0`

#### Scenario: Getters are read-only reactive projections

- GIVEN `store.liveStatus` is used in a Vue computed property
- WHEN the underlying Pinia state changes (e.g. WebSocket connects)
- THEN the computed property MUST recompute automatically without any explicit `watch`
- AND external code MUST NOT be able to set `store.liveStatus` directly (it is driven only by the transport singleton)

#### Scenario: Diagnostic state available on default store

- GIVEN `useObjectStore()` (the default store without the plugin)
- THEN accessing `store.liveStatus` MUST return `undefined` (not throw)
- AND apps that have not opted into `liveUpdatesPlugin` are completely unaffected

---

### Requirement: REQ-ST-LU-009 — Lazy slug resolution for collection subscriptions

When `store.subscribe(type)` is called for a collection (no `id` argument) and `objectTypeRegistry[type].registerSlug` or `schemaSlug` is `null`, the plugin MUST lazy-fetch the slugs via the existing `fetchRegister(registerUuid)` and `fetchSchema(schemaUuid)` actions before opening the transport subscription. Once resolved, slugs MUST be cached in `objectTypeRegistry[type]` so subsequent `subscribe()` calls for the same type are O(1).

If lazy fetch fails (network error, missing register/schema), `subscribe()` MUST reject with an error including the context — NOT silently subscribe to a malformed event key.

#### Scenario: Lazy slug resolution on first subscribe

- GIVEN `store.registerObjectType('melding', 'schema-uuid', 'register-uuid')` was called WITHOUT slugs
- AND `objectTypeRegistry.melding.registerSlug` is `null`
- WHEN `store.subscribe('melding')` is called
- THEN the plugin MUST call `store.fetchRegister('register-uuid')` and `store.fetchSchema('schema-uuid')` to obtain slugs
- AND on success, it MUST update `objectTypeRegistry.melding` with `{ registerSlug: 'zaken', schemaSlug: 'meldingen' }`
- AND it MUST then subscribe to event key `'or-collection-zaken-meldingen'`
- AND `store.liveStatus` MUST be `'connecting'` while fetch is in flight, transitioning to `'live'` after subscription is established

#### Scenario: Cached slugs after first subscribe

- GIVEN slugs were lazy-fetched on a previous subscribe and cached
- WHEN `store.subscribe('melding')` is called again (second component, same type)
- THEN no `fetchRegister` or `fetchSchema` call MUST be made
- AND the subscription MUST attach immediately to the existing event listener (per REQ-ST-LU-003)

#### Scenario: Lazy fetch failure surfaces as rejection

- GIVEN `store.subscribe('melding')` is called and the register UUID does not resolve
- WHEN `store.fetchRegister(registerUuid)` rejects
- THEN `store.subscribe()` MUST reject with an error message including `"melding"` and the underlying cause
- AND no malformed event key (e.g. `or-collection-null-null`) MUST be sent to the transport
- AND `store.liveStatus` MUST NOT change

#### Scenario: Object subscriptions do not need slug lookup

- GIVEN `store.subscribe('melding', 'uuid-abc')` is called (object form, with id)
- THEN slug lookup MUST be skipped entirely (event key is `or-object-uuid-abc`, slug-independent)
- AND the subscription MUST NOT depend on `objectTypeRegistry[type].registerSlug` being populated

---

## Implementation notes (non-normative)

- **Plugin files**: `src/store/plugins/liveUpdates.js` (plugin factory), `src/store/liveUpdates/` (transport modules)
- **Event key constants**: mirror `PushEvents::OR_OBJECT = 'or-object'` and `PushEvents::OR_COLLECTION = 'or-collection'` from OR backend. Define as module-level constants in `src/store/liveUpdates/eventKeys.js`.
- **Last-params stash**: use `store.$onAction` in the plugin's `setup()` hook to intercept `fetchCollection` calls and record params in a plain (non-reactive) Map. Matches the `logsPlugin` auto-refresh pattern.
- **Dedup map**: plain JS `Map` attached to the store instance in `setup()` — not Pinia reactive state, to avoid triggering Vue 2 reactivity on every fetch.
- **Vue 2 scoped dispose**: `tryOnScopeDispose` from `@vueuse/core` 10.x works with Vue 2.7's `getCurrentInstance()`. Inside Options API `mounted()`, the current scope is the component instance.
- **Socket status**: the singleton maintains a private status string and notifies registered observers (the store plugin uses one observer to update `liveStatus`). Multiple stores with the plugin each observe the same singleton.
- **Package addition**: add `"@nextcloud/notify_push": "^2.0.0"` to `dependencies` and `"@vueuse/core": "^10.0.0"` to `peerDependencies` in `package.json`. Update `openspec/specs/store/spec.md` with the `**OpenSpec changes**` reference line per the parent instructions.
