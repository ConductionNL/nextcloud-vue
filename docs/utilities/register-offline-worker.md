---
sidebar_position: 60
---

# registerOfflineWorker

Registers the offline shell service worker, so a field device with no signal
opens the app instead of a browser error page.

```js
import { registerOfflineWorker } from '@conduction/nextcloud-vue'

await registerOfflineWorker({ scriptUrl: '/apps/dossiq/js/offline-sw.js' })
```

| Argument     | Type     | Default              | What it is                                      |
|--------------|----------|----------------------|--------------------------------------------------|
| `scriptUrl`  | `string` | required             | where the host serves the worker from            |
| `scope`      | `string` | the script's folder  | the scope to claim                               |
| `container`  | `object` | `navigator.serviceWorker` | a container to register against, for tests  |

Returns the registration, or `null`.

## It registers nothing by itself

A service worker changes how every request from an origin is answered, for every
app on that origin, until somebody unregisters it. A library that installed one
as a side effect of being imported would take that decision away from the app
that owns the origin, and take it silently. Importing this module registers
nothing: the host calls it, or gets no worker.

## Where it returns null

- The browser has no service worker support.
- No `scriptUrl` was named.
- The registration was refused, for instance on an insecure origin. It warns and
  returns `null` rather than throwing, because the leaf captures and queues
  perfectly well without a worker: the worker only decides whether the **shell**
  opens with no signal, not whether anything can be recorded.

## What the worker does and refuses to do

It caches the shell and the built bundle. It never answers an object read from
cache, and never a write.

A cached read looks exactly like a fresh one, so somebody would be shown a
status, an address or an assignment from an earlier moment with nothing on
screen to say how old it is, and would act on it in front of a citizen. Stale
data belongs in the planning cache, which carries an expiry and a download time
and says out loud when it is out of date. A cached write would be a claim to
have reached the server, which is the one thing the queue exists to make
visible.

A new bundle version **replaces** the cache rather than adding to it. One cache
per release serves last month's bundle to whichever request hits the older
entry, and grows without limit on a device nobody clears.

## What it cannot do

It cannot save a queue on a device nobody opens again. The queue lives in that
browser profile's IndexedDB and has no server-side twin; a worker caches a page,
it does not hand a queue to a server. See
[offlineCollection](./offline-collection.md).

See also [unregisterOfflineWorker](./unregister-offline-worker.md).
