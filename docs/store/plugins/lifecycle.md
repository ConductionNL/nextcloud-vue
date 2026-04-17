# lifecyclePlugin

Adds object-lifecycle actions to the object store: lock, unlock, publish, depublish, revert, and merge. All actions POST to `/{register}/{schema}/{objectId}/{action}` and, on success, update the cached object in `state.objects` when the response includes an `id`.

> Despite the name, this plugin has nothing to do with Pinia lifecycle hooks — it manages the lifecycle of *objects* (lock, publish, …).

## Usage

```js
import { createObjectStore, lifecyclePlugin } from '@conduction/nextcloud-vue'

const useMyStore = createObjectStore('myapp', {
  plugins: [lifecyclePlugin()],
})

const store = useMyStore()

// Lock / unlock
await store.lockObject('case', caseId, { process: 'review', duration: 3600 })
await store.unlockObject('case', caseId)

// Publish / depublish
await store.publishObject('case', caseId, { date: '2026-01-01' })
await store.depublishObject('case', caseId, { date: '2026-12-31' })

// Revert to a previous version
await store.revertObject('case', caseId, { auditTrailId: 'abc-123' })

// Merge two objects
await store.mergeObjects('case', sourceId, {
  target: targetId,
  fileAction: 'move',
  relationAction: 'copy',
})

store.clearLifecycle()
```

## State

| Property | Type |
|----------|------|
| `lifecycleLoading` | `boolean` |
| `lifecycleError` | `ApiError \| null` |

## Getters

`isLifecycleLoading`, `getLifecycleError`.

## Actions

| Action | Signature | Description |
|--------|-----------|-------------|
| `lockObject` | `(type, objectId, { process?, duration? }) => Promise<object \| null>` | Prevent concurrent edits. `duration` in seconds. |
| `unlockObject` | `(type, objectId) => Promise<object \| null>` | Release the lock. |
| `publishObject` | `(type, objectId, { date? }) => Promise<object \| null>` | Make the object publicly accessible. `date` is ISO 8601. |
| `depublishObject` | `(type, objectId, { date? }) => Promise<object \| null>` | Revoke public access. |
| `revertObject` | `(type, objectId, { datetime?, auditTrailId?, version?, overwriteVersion? }) => Promise<object \| null>` | Roll back to an earlier version. |
| `mergeObjects` | `(type, sourceId, { target, fileAction?, relationAction?, referenceAction? }) => Promise<object \| null>` | Merge `sourceId` into `target`. `fileAction` / `relationAction` / `referenceAction`: `'move' \| 'copy' \| 'skip'`. |
| `clearLifecycle` | `() => void` | Reset `lifecycleLoading` and `lifecycleError`. |

All actions return `null` on HTTP or network failure and set `lifecycleError` ([`parseResponseError`](../../utilities/parse-response-error.md) / [`networkError`](../../utilities/network-error.md)). On success, if the response payload has an `id`, the matching entry under `state.objects[type][id]` is updated in place so components reading that cache see the new data.
