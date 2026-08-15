# useObjectSubscription

Auto-managed live-update subscription for a single OpenRegister object (or a collection). Wraps `objectStore.subscribe(type, id?)` from [`liveUpdatesPlugin`](../../store/plugins/live-updates.md) with a Vue scope-bound lifecycle: subscribes on mount, releases on unmount, re-subscribes when reactive inputs change.

## Signature

```js
import { useObjectSubscription } from '@conduction/nextcloud-vue'

const { status, lastEventAt } = useObjectSubscription(objectStore, type, id, options)
```

## Arguments

| Name | Type | Description |
|------|------|-------------|
| `objectStore` | `object` | Pinia store instance (typically `useObjectStore()`). |
| `type` | `string \| Ref<string> \| () => string` | Object type slug — plain value, ref, or getter function. |
| `id` | `string \| Ref<string> \| () => string \| null` | Object UUID for per-object subscription (plain, ref, or getter), or `null` for the collection. |
| `options.enabled` | `boolean \| Ref<boolean> \| () => boolean` | Reactive gate (plain, ref, or getter); subscribe only when truthy. Default `true`. |

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `status` | `Ref<'connecting' \| 'open' \| 'closed'>` | Subscription state. |
| `lastEventAt` | `Ref<Date \| null>` | Timestamp of the most recent event seen by the underlying plugin. |

## Notes

- Used by default inside [`CnDetailPage`](../../components/cn-detail-page.md), [`CnIndexPage`](../../components/cn-index-page.md) (self-fetch mode, collection scope), and [`CnObjectSidebar`](../../components/cn-object-sidebar.md). Set `subscribe: false` on those components to opt out.
- The composable does not refetch on its own; the `liveUpdatesPlugin` already invalidates the store cache on each `or-object-{uuid}` event, which triggers a refetch and a reactive re-render in any consumer reading from `objectStore.objects[type][id]`.
- **Stale-resolution guard (epoch counter):** `objectStore.subscribe()` is async. When it resolves *after* the component unmounted — or after the type/id scope already changed to a newer subscription — the late handle is released immediately instead of stored, so no subscription leaks past its scope. Overlapping attach calls (double-subscribe races) collapse to exactly one live handle.
- **Inert on incapable stores:** a store without a `subscribe` action (created with `liveUpdates: false`, or a plain mock) is a silent no-op — `status` stays `'closed'`, nothing connects.
- See [OpenRegister push events docs](https://github.com/ConductionNL/openregister/blob/development/docs/Integrations/OpenRegister.md) for the wire format.
