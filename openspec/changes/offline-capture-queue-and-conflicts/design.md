# Design: offline capture, its queue and its conflicts

## Component and surface

`src/integrations/offline/` (the Dexie store, the pure engine, the replay
service), the two `field-inspection` components, a new `CnOfflineQueue`
under `src/components/`, and a service worker plus a registration helper
under `src/offline/`.

Kind: code, plus `offlineConfig` keys the consuming app supplies.

## D1. The queue is a surface, not a number

Today the leaf renders `countPending` and a word. An inspector who sees
"3 queued" cannot tell whether three photos are waiting for a signal or
three writes have been refused nine times each. `CnOfflineQueue` lists
the rows the store already holds: `operationType`, the target, `queuedAt`,
`status`, `attempts` and the last error. The table is
`mutationQueue: 'id, deviceId, status, queuedAt, register, schema'`, so
the listing is an index read, not a new store.

## D2. A conflict becomes an object

`classifyConflict` turns a 409 or a 404 into `concurrent_edit`,
`deleted_remote` or `permission_lost`, and `nextState` writes that onto
the local row. The row then stops. Nobody outside the device ever learns
the write was refused, and dossiq's `conflictRecord` schema, which exists
to record exactly this "plus its resolution for AVG audit", stays empty.

So the leaf writes a conflict object when it classifies one, to
`offlineConfig.conflictSchema` in `offlineConfig.register`, carrying
`syncQueueRef`, `conflictType`, `clientVersion` (the payload that was
refused) and `serverVersion` (the body the server returned). That write
is itself queued, because a conflict is usually found the moment the
signal comes back and the connection is the least reliable thing in the
scenario.

An app that names no conflict schema keeps today's behaviour and the
queue surface says the conflict is local. Silently doing nothing is what
we are ending, so the surface has to say it.

## D3. Resolution is the inspector's, and permission is not negotiable

`resolveConflictChoice(resolution)` already maps `client_wins` to a
requeue, `server_wins` to a terminal drop and `manual_merge` to a requeue
with a merged payload, and it throws on anything else. The queue row
offers those three and calls that function. `isConflictRetryable` returns
false for `permission_lost`, so that row offers no retry at all and says
the inspector lost the right to write this object. Offering a retry that
the server will refuse again is the failure mode.

The resolution is written back onto the conflict object as `resolution`,
`resolvedBy` and `resolvedAt`, which is the audit half the schema's own
description asks for.

## D4. Working without a signal is two different problems

One is data, and the core solves it: `storePlanning` caches the day, the
checklist is rendered from the cache, `enqueueMutation` buffers the
write. The other is the shell. A Nextcloud app is served per request. An
inspector who closes the tab in a cellar cannot open it again, and no
amount of IndexedDB helps, which is what "an inspector still cannot work
without a signal" means in the ledger note.

So the library ships the worker and the helper, and the host serves the
file. It has to be the host: a service worker's scope is the path it is
served from, and an npm package cannot be served from
`/apps/dossiq/`. The helper registers it, the worker caches the built
bundle and the leaf's route with a cache-first strategy for the shell and
never for an object read, and both are opt-in.

## D5. Dexie stays a buffer

ADR-070 makes OpenRegister the default record. The queue and the object
cache are a device buffer with a TTL, which is inside that default: they
hold nothing OpenRegister does not eventually hold. The conflict was the
exception, because it was the one fact that lived only on the device and
never got replayed anywhere. D2 removes the exception rather than writing
an exception ADR for it.

## D6. What the tests have to prove

The engine is pure and already covered. What is not covered is the wiring,
which is precisely what went missing:

- a conflicted replay writes a conflict object, and the write is queued
  when the device is offline,
- `resolveConflictChoice` is reached from the surface, once per choice,
- a `permission_lost` row offers no retry,
- a completed checklist survives a reload with no signal,
- the worker serves the shell from cache when the network is refused.

A test that asserts only `countPending` moved would pass on a leaf that
lost its reader again, which is how this got here.
