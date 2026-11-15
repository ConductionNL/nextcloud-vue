# A write made offline is sent once there is a connection

## Why
pipelinq's mobile timer must keep a time entry started or stopped without a connection and send it later, once
(`time-entry-mobile-offline` task 1.1). The library's offline core replays OpenRegister object writes for the field
leaf; nothing let an app queue an arbitrary write.

## What changes
`useOfflineQueue(name, { idb, send })`: writes kept in IndexedDB with an idempotency key, flushed in order on enqueue,
on `online` and on mount, dropped only after a 2xx or a 409, with `pendingCount`. Exported from the barrel.
