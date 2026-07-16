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
| `type` | `string \| Ref<string>` | Object type slug. |
| `id` | `string \| Ref<string> \| null` | Object UUID for per-object subscription, or `null` for the collection. |
| `options.enabled` | `boolean \| Ref<boolean>` | Reactive gate; subscribe only when truthy. Default `true`. |

## Returns

| Field | Type | Description |
|-------|------|-------------|
| `status` | `Ref<'connecting' \| 'open' \| 'closed'>` | Subscription state. |
| `lastEventAt` | `Ref<Date \| null>` | Timestamp of the most recent event seen by the underlying plugin. |

## Notes

- Used by default inside [`CnDetailPage`](../../components/cn-detail-page.md) and [`CnObjectSidebar`](../../components/cn-object-sidebar.md). Set `subscribe: false` on those components to opt out.
- The composable does not refetch on its own; the `liveUpdatesPlugin` already invalidates the store cache on each `or-object-{uuid}` event, which triggers a refetch and a reactive re-render in any consumer reading from `objectStore.objects[type][id]`.
- See [OpenRegister push events docs](https://github.com/ConductionNL/openregister/blob/development/docs/Integrations/OpenRegister.md) for the wire format.
