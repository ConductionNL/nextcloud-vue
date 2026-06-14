# Design: add-live-updates-plugin

## Architecture Overview

The live-updates plugin adds a transport-agnostic subscription API on top of the existing `useObjectStore` plugin architecture. All new code lives in `src/store/plugins/liveUpdates.js` with a singleton transport module at `src/store/liveUpdates/transport.js`.

```
store.subscribe(type, id?)            store.unsubscribe(handle)
        │                                       │
        ▼                                       ▼
  liveUpdatesPlugin (store plugin)
        │ registers listener                    │ decrements refcount
        ▼                                       ▼
  getLiveUpdates() ← module-level singleton
        │
        ├── WebSocket transport (primary)
        │     @nextcloud/notify_push listen()
        │     Reconnect: exp backoff + jitter (base 1s, cap 30s, ×2)
        │
        └── Polling transport (fallback)
              setInterval per (type, paramsHash)
              Visibility-gated (pauses when tab hidden)
              Coalesced refcount — one interval per unique subscription key

On event arrival:
  or-object-{uuid}        → store.fetchObject(type, id)       [deduplicated]
  or-collection-{r}-{s}  → store.fetchCollection(type, params) [deduplicated]
```

## Component API Design

### Plugin export

```js
import { liveUpdatesPlugin } from '@conduction/nextcloud-vue'

const useMyStore = createObjectStore('my-store', {
  plugins: [liveUpdatesPlugin()],
})
```

### `store.subscribe(type, id?)`

```js
// Subscribe to a single object (detail view)
const handle = store.subscribe('melding', 'uuid-abc')
// Subscribes to or-object-uuid-abc
// On event → store.fetchObject('melding', 'uuid-abc')

// Subscribe to a collection (list view)
const handle = store.subscribe('melding')
// Derives event key from objectTypeRegistry['melding']:
//   or-collection-{registerSlug}-{schemaSlug}
// On event → store.fetchCollection('melding', lastParams)

// In a Vue component: auto-cleanup on unmount
mounted() {
  this.handle = this.store.subscribe('melding', this.id)
},
beforeDestroy() {
  this.store.unsubscribe(this.handle)
  // or: tryOnScopeDispose handles this automatically when called in setup()
}
```

### `store.unsubscribe(handle)`

```js
store.unsubscribe(handle)
// Decrements refcount for handle's event key
// When refcount → 0: removes underlying socket/interval listener
// Other event keys are unaffected
```

### Diagnostic getters

```js
store.liveStatus       // 'connecting' | 'live' | 'reconnecting' | 'polling' | 'offline'
store.liveSubscriptions // number — active subscription count
store.liveLastEventAt  // timestamp (Date|null) — last event received
```

## File Structure

```
src/store/plugins/
  liveUpdates.js          ← plugin factory (export: liveUpdatesPlugin)
src/store/liveUpdates/
  transport.js            ← module-level singleton (getLiveUpdates)
  websocketTransport.js   ← @nextcloud/notify_push wrapper + backoff
  pollingTransport.js     ← setInterval + visibility gate
  eventKeys.js            ← OR_OBJECT / OR_COLLECTION constants
```

## Transport Architecture

### Primary: WebSocket via @nextcloud/notify_push

`@nextcloud/notify_push` exposes a `listen(eventKey, callback)` function that subscribes to `notify_custom` events from Nextcloud's push server. The singleton wraps this with:

- **Lazy init**: first `subscribe()` call triggers connection; subsequent calls reuse it.
- **Refcounted listeners**: `Map<eventKey, Set<callback>>`. `listen()` is called once per unique key; internal fan-out dispatches to all callbacks for that key.
- **Reconnect**: when the WebSocket disconnects, exponential backoff reconnects (base 1s, cap 30s, ×2). On successful reconnect, all active event keys re-attach. One round of refetches fires immediately (jittered 0–500ms each) to resync state.
- **Status**: `connecting → live → reconnecting → live` cycle is reflected in `store.liveStatus`.

### Fallback: Polling transport

Activated when `@nextcloud/notify_push` `listen()` returns `null` (app not installed or WebSocket unreachable after initial connect attempt).

- One `setInterval` per unique subscription key (type + optional id or params hash).
- **Coalesced refcount**: if 5 components subscribe to the same collection, one interval runs — not five.
- **Visibility gate**: `document.visibilityState`. Polling is suspended when the tab is hidden and resumes on `visibilitychange` without waiting for the interval to fire.
- **Default intervals**: 30s for collections, 60s for objects (configurable via `liveUpdatesPlugin({ pollIntervalCollection: 30000, pollIntervalObject: 60000 })`).
- **Status**: `store.liveStatus = 'polling'` when in fallback mode.

### Reconnect with jitter

```
backoff = min(base × 2^attempt, cap)
delay   = backoff + random() × backoff   // 0–100% jitter
```

On reconnect: all subscriptions re-attach in one batch. Refetches fire with individual jitter (0–500ms each) to spread load across the server-side QPS budget.

## In-Flight Fetch Deduplication

A burst of `or-object-{uuid}` events (e.g. 5 concurrent components all subscribe) arrives as a single event. Without dedup, 5 identical `fetchObject` calls fire simultaneously.

**Implementation**: `store._fetchObjectPromise` (Map keyed by `"type:id"`) and `store._fetchCollectionPromise` (Map keyed by `"type:paramsHash"`). When a fetch is triggered:

1. Check if a promise is already in-flight for that key.
2. If yes, return the existing promise — all waiters share one response.
3. If no, create the promise, store it in the map, start the fetch.
4. On resolve or reject: remove from the map.

This is a pure in-memory cache with no TTL; the promise is removed as soon as it settles. It does not affect the existing cache in `store.objects` or `store.collections`.

The dedup map is stored on the plugin's setup state (not Pinia reactive state, to avoid triggering reactivity on every fetch). It is a plain JS Map attached to the store instance during `setup()`.

## Stashing Last Params

`store.fetchCollection` is augmented (via `store.$onAction`) to record the last params used per type in `store._lastCollectionParams[type]`. When a collection event arrives, the plugin calls `store.fetchCollection(type, store._lastCollectionParams[type] || {})`.

This means collection subscribers always refetch with the same filters/sorting the component last used — they do not reset to defaults.

`_lastCollectionParams` is stored as plain state (not reactive) on the plugin's state object to avoid Vue 2 reactivity cost on every collection call.

## State Contributed by the Plugin

| State key | Type | Default | Description |
|---|---|---|---|
| `liveStatus` | string | `'offline'` | Transport status |
| `liveSubscriptions` | number | `0` | Active subscription count |
| `liveLastEventAt` | Date\|null | `null` | Timestamp of last received event |

These are reactive Pinia state. `liveStatus` and `liveSubscriptions` are suitable for surfacing in admin/debug UIs.

## Bundle Size

- `@nextcloud/notify_push` — ~3.5 KB gzipped (as of v2.0.0). This is the Nextcloud-maintained notify_push client; it is intentionally tiny (no framework dependency, pure WebSocket wrapper).
- `@vueuse/core` — **direct runtime dependency**. Audit shows 2 of 7 consumer apps (openregister, opencatalogi) currently bundle VueUse, so making it a peer dep would force the other 5 (procest, pipelinq, docudesk, mydash, larpingapp) to add it manually. The two composables we use (`tryOnScopeDispose`, `useDocumentVisibility`) are tree-shakeable; Rollup ships ~400 bytes gzipped combined.
- Plugin code itself: estimated ~3 KB gzipped.
- Total incremental cost for consumers: ~7 KB gzipped (one-time, shared across all store instances).

## Performance Considerations

- **One socket per tab**: Regardless of how many `createObjectStore` instances, components, or tabs are open in the same browser tab, there is exactly one WebSocket connection to the Nextcloud push server. The per-tab cost is one keep-alive packet every 30s.
- **Refcounted listeners**: `listen()` is called once per unique event key, not once per subscriber. A detail view and an index page both watching the same object share one underlying listener.
- **One fetch per event burst**: The in-flight dedup map ensures a burst of events (e.g. from reconnect refetch) results in at most one HTTP request per (type, id) or (type, paramsHash), not one per subscriber.
- **Polling coalesced**: Multiple components subscribing to the same collection share one interval. Intervals for hidden tabs are suspended — no wasted requests when the user is not looking.
- **Collection events on create/delete only**: The OR backend does not emit `or-collection-...` on field edits. This means list-view components do not refetch their entire list on a field update, eliminating the most common source of list-refetch storms.
- **Memory**: Subscriptions created inside Vue component lifecycles auto-cleanup via `tryOnScopeDispose`. The refcount mechanism drives socket teardown when the last listener for a key leaves. The dedup map holds references only to in-flight promises; it is empty between events.
- **Reconnect jitter**: After a WebSocket reconnect, per-subscription refetches are spread across a 500ms window. For 20 active subscriptions this adds at most 500ms of spread; at the default NC push server's QPS limit, this is well within the safe zone for single-instance Nextcloud.

## No Seed Data

This change introduces no new OpenRegister schemas, registers, or objects. No seed data section is required.

## Vue 2 Compatibility

- `tryOnScopeDispose` from `@vueuse/core` works with Vue 2.7's `getCurrentInstance()`.
- `useDocumentVisibility` from `@vueuse/core` is a plain composable with no Vue 3-only APIs.
- The plugin's `setup()` hook (called by `defineObjectStore`) runs in the Pinia store's initialization, not inside a Vue component, so no Vue lifecycle dependency exists at the plugin level.
- All reactive state uses the existing Pinia Options API spread pattern (`{ ...this.state, [key]: value }`) to remain Vue 2 compatible.

## Dependencies Impact

| Package | Existing | Change | Rationale |
|---|---|---|---|
| `@nextcloud/notify_push` | No | Add as `dependencies` | This library owns the push integration; direct dep keeps it consistent with `@nextcloud/capabilities`, `@nextcloud/dialogs` |
| `@vueuse/core` | No | Add as `dependencies` | 2 of 7 consumer apps already bundle it; making peer would force the other 5 to add it manually. Tree-shaken: only `tryOnScopeDispose` + `useDocumentVisibility` ship (~400 bytes gzipped). |

## Consumer Migration Pattern (for context — implemented in per-app changes)

```js
// Before: polling in mounted()
mounted() {
  this.pollInterval = setInterval(() => {
    this.store.fetchCollection('melding')
  }, 30000)
},
beforeDestroy() {
  clearInterval(this.pollInterval)
}

// After: reactive subscription
mounted() {
  this.handle = this.store.subscribe('melding')
},
beforeDestroy() {
  this.store.unsubscribe(this.handle)
}
// Or, in a composable/setup context:
// const handle = store.subscribe('melding')
// tryOnScopeDispose(() => store.unsubscribe(handle))
```
