# useOfflineQueue

Keep writes made without a connection and send them once there is one.

```js
import { useOfflineQueue } from '@conduction/nextcloud-vue'

const queue = useOfflineQueue('pipelinq-time')
await queue.enqueue({ method: 'POST', url: '/apps/openregister/api/objects/time/entry', body: { minutes: 30 } })
// queue.pendingCount is the number of writes still waiting, for an "1 entry waiting to be sent" line.
```

A write (`method`, `url`, `body`) is stored in IndexedDB under an idempotency key (`key`, a new one by default) and sent with the header `Idempotency-Key: <key>`. The queue is flushed in the order the writes were made: when a write is enqueued while online, on the `online` event and when the component mounts. An entry is dropped only after the server answered with a 2xx, or with 409 (it already has that write). Any other answer, or none, stops the flush and keeps that write and the ones after it for the next flush.

Used inside a component, the queue starts on mount and stops listening on unmount. Elsewhere, call `start()` and `stop()` yourself.

## Returns

| Name | Type | Description |
|------|------|-------------|
| `pendingCount` | `Ref<number>` | The writes still waiting. |
| `enqueue(write)` | `Promise<string>` | Keep `{ method?, url, body?, key? }` (method defaults to POST) and flush when online; resolves the idempotency key. |
| `flush()` | `Promise<number>` | Send in order until one does not go through; resolves what is still waiting. |
| `start()` / `stop()` | | Flush now and on every `online` event, or stop listening. |

## Options

`useOfflineQueue(name, { idb?, send? })`: `name` keeps queues apart, `idb` is the IndexedDB factory (for tests), and `send(write)` replaces the default axios request (it must resolve `{ status }` or reject with `error.response.status`). The server decides what a repeated key means: OpenRegister and app endpoints that honour `Idempotency-Key` store a repeated write once.
