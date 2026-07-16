# liveUpdatesPlugin

Adds real-time update support to a store created via `createObjectStore()`. Subscribes to OpenRegister object/collection events through `@nextcloud/notify_push` and falls back to polling when the push transport is unavailable.

## Usage

```js
import { createObjectStore, liveUpdatesPlugin } from '@conduction/nextcloud-vue'

const useMyStore = createObjectStore('myapp', {
  plugins: [liveUpdatesPlugin({
    pollIntervalCollection: 15000,
    pollIntervalObject: 60000,
  })],
})

const store = useMyStore()

// Subscribe to a collection
const collectionHandle = await store.subscribe('melding')

// Subscribe to a single object
const objectHandle = await store.subscribe('melding', meldingId)

// Tear down (manual — see "Cleanup" below)
store.unsubscribe(collectionHandle)
store.unsubscribe(objectHandle)
```

## Plugin options

| Option | Default | Purpose |
|---|---|---|
| `pollIntervalCollection` | `30000` | Polling interval (ms) used for collection subscriptions when the push transport is unavailable. |
| `pollIntervalObject` | `60000` | Polling interval (ms) used for single-object subscriptions when the push transport is unavailable. Higher than the collection default because object updates tend to be less frequent and read-amplified by upstream caches. |

## Contributed state

| State | Type | Purpose |
|---|---|---|
| `liveStatus` | string | Transport status: `'offline' \| 'connecting' \| 'live' \| 'reconnecting' \| 'polling'`. |
| `liveSubscriptions` | number | Count of active subscription handles. |
| `liveLastEventAt` | `Date \| null` | Timestamp of the most recently received live event. `null` until the first event arrives. |

## Contributed getters

`getLiveStatus`, `getLiveSubscriptions`, `getLiveLastEventAt` — read-only accessors mirroring the state above.

## Contributed actions

| Action | Returns | Purpose |
|---|---|---|
| `subscribe(type, id?, opts?)` | handle | Start a subscription. Pass only `type` for a collection subscription, both `type` and `id` for a single-object subscription. Returns an opaque handle to pass to `unsubscribe`. |
| `unsubscribe(handle)` | `void` | Tear down a subscription created via `subscribe()`. |

## Cleanup

When called from a Vue 3 `setup()` or any context with an active VueUse scope, subscriptions are automatically released on scope dispose via `tryOnScopeDispose` (from `@vueuse/core`).

In Vue 2.7 Options API `mounted()` without an active scope, the auto-cleanup does not fire — call `store.unsubscribe(handle)` from `beforeDestroy()` manually:

```js
export default {
  data: () => ({ _liveHandle: null }),
  async mounted() {
    this._liveHandle = await store.subscribe('melding')
  },
  beforeDestroy() {
    if (this._liveHandle) store.unsubscribe(this._liveHandle)
  },
}
```

## In-flight dedup

The plugin coalesces concurrent `fetchObject(type, id)` and `fetchCollection(type, params)` calls for the same key into a single HTTP request. The dedup maps live as plain (non-reactive) `Map`s on the store instance to avoid Vue 2 reactivity overhead — they are an internal implementation detail and not part of the public API.

## Transport

The plugin uses the singleton transport at `getLiveUpdates()` (internal; see `src/store/liveUpdates/transport.js`). The transport prefers `@nextcloud/notify_push` and degrades gracefully:

1. **Push available** → `liveStatus: 'live'`. No polling.
2. **Push unavailable** → `liveStatus: 'polling'`. Subscriptions fall back to interval polling at `pollIntervalCollection` / `pollIntervalObject`.
3. **Disconnect** → `liveStatus: 'reconnecting'` while the transport retries; `'offline'` if reconnect attempts are exhausted.

## Related

- [`useObjectStore`](../object-store.md) — the underlying generic store this plugin extends.
- [`createObjectStore`](../object-store.md) — factory used to instantiate a plugged store.
