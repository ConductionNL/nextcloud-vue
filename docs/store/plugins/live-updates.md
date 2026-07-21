# liveUpdatesPlugin

Adds real-time update support to a store created via `createObjectStore()`. Subscribes to OpenRegister object/collection events through `@nextcloud/notify_push` and falls back to polling when the push transport is unavailable.

## Installed by default

Since the `live-updates-default-on` change, `createObjectStore()` installs this plugin **by default** — you no longer need to pass it explicitly:

```js
import { createObjectStore } from '@conduction/nextcloud-vue'

// subscribe()/unsubscribe() available out of the box
const useMyStore = createObjectStore('myapp')

// Opt out entirely — no subscribe/unsubscribe actions, no live state
const useStaticStore = createObjectStore('myapp-static', { liveUpdates: false })

// Configure the default install
const useFastStore = createObjectStore('myapp-fast', {
  liveUpdates: { pollIntervalCollection: 15000 },
})
```

The default install is **inert until the first `subscribe()` call**: no `notify_push` probe, no websocket connection, no polling timers, and no request-dedup wrapping happen before that. Stores that never subscribe behave exactly as if the plugin were absent.

The library's **default store** (`useObjectStore()`, id `conduction-objects`) also ships with the plugin installed — same inertness guarantee. This is what powers zero-config live updates on manifest-driven pages (see below).

Explicitly passing the plugin (the style below) keeps working and is **not double-installed** — when `options.plugins` already contains a `liveUpdatesPlugin(...)` instance, that instance and its options win. `liveUpdates: false` only suppresses the default injection; it never strips an explicitly passed plugin.

## Manifest pages subscribe automatically

Manifest-driven pages resolve the default store internally and wire their own subscriptions — an app whose pages come from a JSON manifest gets live updates **with zero app-side changes**:

- **`type:"index"` pages** (CnIndexPage self-fetch mode) subscribe to the collection scope `or-collection-{register}-{schema}` and refetch the list — with its current params — when an event arrives.
- **`type:"detail"` pages** (CnDetailPage schema-driven mode) subscribe to `or-object-{id}` and refetch the object; the page re-renders from the store cache reactively.
- **v2 widget-grid `type:"detail"` pages** (body/sidebar/tab widgets rendered by CnWidgetGrid instead of a typed page component) are live too: CnPageRenderer subscribes to `or-object-{id}` for the loaded object, and the `cnDetailObjectContext` holder it provides reads `objectData` / `schema` **through the store cache** — so every widget fed from the holder (`data`, `metadata`, stat/chart/delta token resolution, …) re-renders when the event-driven refetch lands, rather than holding a mount-time snapshot.

All of these respect a `config.subscribe: false` opt-out on the page entry, release their subscription on unmount (and, for the renderer path, when navigating to a non-detail page), and stay fully inert while no such page is mounted. Apps that pass their own `objectStore` prop keep their explicit store — the fallback only engages when none is provided.

## Usage (explicit)

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
| `refetchDebounce` | `750` | Event-burst coalescing window (ms). Live events are hints; the first event in a burst refetches immediately and further events inside the window collapse into one trailing refetch. `0` disables coalescing (every event refetches). Override per subscription with `subscribe(type, id, { debounce })`. Internally the value is handed to the hint coalescer as its `waitMs` window. |

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
| `subscribe(type, id?, opts?)` | handle | Start a subscription. Pass only `type` for a collection subscription, both `type` and `id` for a single-object subscription. `opts.interval` overrides the poll interval; `opts.debounce` overrides the event-coalescing window. Returns an opaque handle to pass to `unsubscribe`. |
| `unsubscribe(handle)` | `void` | Tear down a subscription created via `subscribe()`. Idempotent — releasing the same handle twice is a no-op the second time. Cancels any pending coalesced refetch. |

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

Dedup activates on the **first `subscribe()` call**. Before that, `fetchObject` / `fetchCollection` pass straight through to the base implementations, so a store that never subscribes has zero behaviour change from the (default-installed) plugin.

## Transport

The plugin uses the singleton transport at `getLiveUpdates()` (internal; see `src/store/liveUpdates/transport.js`). The transport prefers `@nextcloud/notify_push` and degrades gracefully:

1. **Push available** → `liveStatus: 'live'`. No polling.
2. **Push unavailable** → `liveStatus: 'polling'`. Subscriptions fall back to interval polling at `pollIntervalCollection` / `pollIntervalObject`.
3. **Disconnect** → `liveStatus: 'reconnecting'` while the transport retries; `'offline'` if reconnect attempts are exhausted.

## Related

- [`useObjectStore`](../object-store.md) — the underlying generic store this plugin extends.
- [`createObjectStore`](../object-store.md) — factory used to instantiate a plugged store.
