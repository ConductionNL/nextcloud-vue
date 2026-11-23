---
sidebar_position: 61
---

# unregisterOfflineWorker

Removes the offline shell service worker from this origin.

```js
import { unregisterOfflineWorker } from '@conduction/nextcloud-vue'

const removed = await unregisterOfflineWorker()
```

| Argument    | Type     | Default                   | What it is                          |
|-------------|----------|---------------------------|--------------------------------------|
| `container` | `object` | `navigator.serviceWorker` | a container to act on, for tests     |

Returns how many registrations were removed, and `0` where the browser has no
service worker support.

## Why it exists

A host that opts in has to be able to opt back out. A worker that can only be
removed by clearing site data outlives the decision to use it, and the person
who has to undo it is usually not the person who chose it.

Removing the worker does not touch the offline queue or the cached planning.
Those live in IndexedDB and are the app's data, not the worker's cache.

See also [registerOfflineWorker](./register-offline-worker.md).
