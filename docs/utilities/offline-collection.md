# offlineCollection

Generic **offline field data-collection core**. A single namespace object that
bundles the reusable offline-sync infrastructure extracted from procest's
`mobiel-inspectie-offline` PWA, so any Conduction app can collect field data
offline by registering a checklist/planning schema instead of re-implementing
the IndexedDB cache, mutation queue, replay loop and sync-state indicator.

```js
import { offlineCollection } from '@conduction/nextcloud-vue'
// or, tree-shaken, the individual helpers:
import { drainQueue, storePlanning } from '@conduction/nextcloud-vue/src/integrations/offline'
```

It powers the built-in [`field-inspection`](./field-inspection-integration.md)
integration leaf (sidebar tab + surface-aware widget) but is consumable on its
own.

## What it provides

### IndexedDB cache + mutation queue (`offlineDb.js`)

A generic Dexie store keyed by `register` + `schema` so multiple apps/schemas
share one database without colliding. Three tables: `objectCache`,
`mutationQueue`, `meta`.

- `cacheKey(register, schema, collection, objectId)` — composite cache key.
- `getDb()` — open (and memoise) the Dexie database (lazy-imports `dexie`).
- `storePlanning({ register, schema, items, references, referenceSchema, collection, manifest, ttlMs })`
  — atomically cache a downloaded planning payload + its reference objects.
- `getPlannedItems(register, schema, collection?)` — read cached planned items.
- `getCachedObject(register, schema, collection, objectId)` — read one cached object.
- `getPlanningMeta(register, schema, collection?)` — read the planning meta row.
- `enqueueMutation(operation)` — queue one offline create/update/delete.
- `countPending(deviceId?)`: count queue operations still expected to send on
  their own (`pending`, `conflict`, `syncing`).
- `countStuck(deviceId?)`: count the ones that will not, which is `failed`.
  Counted apart and never folded in, because "12 waiting" and "12 waiting, 1
  stuck" are different sentences.
- `listQueue(deviceId?)`: every operation, failed ones included, oldest first.
- `requeueOperation(operationId)`: put one failed operation back by hand.
  Refuses a `permission_lost` one, which no retry can help.
- `recordConflict({ operation, conflictType, serverObject, register, conflictSchema })`:
  file a classified conflict as an object of its own, through the queue. Written
  once per conflicting operation. With no `conflictSchema` nothing is written and
  the queue row is marked `conflictScope: 'local'`, so the list can say the clash
  is visible on this device only.
- `applyConflictResolution({ operationId, resolution, mergedPayload, resolvedBy })`:
  apply a person's choice. Keep theirs also leaves the local cache holding the
  server's version, and the resolution, the person and the time are written onto
  the conflict object.
- `resolveDeviceId(storage?)` — stable per-device id (IDOR scope) in localStorage.

`dexie` is an **optional peer dependency**: only apps that use the offline core
need it installed. The pure engine/helpers stay importable without it.

### Pure sync-queue engine (`syncQueueEngine.js`)

Connectivity-independent decision logic — DOM-free and unit-testable in Node.

- `BACKOFF_SCHEDULE_MS`, `MAX_ATTEMPTS`, `TERMINAL_STATUSES` — constants.
- `orderForReplay(operations)` — FIFO order, terminal ops filtered out.
- `delayForAttempt(attemptCount)` / `canRetry(attemptCount)` — backoff schedule.
- `classifyConflict(statusCode, serverObject)` — 403/404/409 → conflict type.
- `isConflictRetryable(conflictType)` — `permission_lost` is terminal.
- `nextState(operation, result)` — pure status transition from an HTTP outcome.
- `resolveConflictChoice(resolution, mergedPayload?)` — client/server/merge wins.
- `diffVersions(clientVersion, serverVersion)` — field-level merge diff.

### Replay-on-reconnect (`syncReplayService.js`)

Drains the device's queued mutations against the **standard OpenRegister object
API** (`/apps/openregister/api/objects/{register}/{schema}`) on reconnect and
applies the engine transition to each queue row. RBAC/IDOR re-authorization
happens inside OR's own object API — no per-app outcome endpoint needed.

- `replayOperation(operation)` — replay one mutation, return the engine patch.
- `drainQueue(deviceId)` — drain the device's pending queue in FIFO order.

### Daily-planning fetch contract (`planningFetch.js`)

Replaces a bespoke `/sync/daily` endpoint with a configurable query against the
standard OR object API.

- `toDayString(date)` — `YYYY-MM-DD` day string.
- `buildPlanningQuery(config)` — turn assignee/date config into object-API params.
- `fetchPlanning(config)` — fetch today's planned items for a register/schema.
- `fetchReferences(config)` — fetch the reference objects (e.g. checklist templates).

The fetch is purely config-driven: an app that plans by `assignee` + `scheduledAt`
and one that plans by `inspectorRef` + `plannedFor` both work without code
changes.

### Sync-state + checklist helpers (`fieldCollectionHelpers.js`)

DOM-free, app-name-free helpers.

- `GPS_POOR_ACCURACY_M` — poor-signal threshold (metres).
- `classifyGps(fix, available?)` — good / poor / sensorless + warning copy.
- `validateChecklistAnswers(template, answersByQuestion)` — required-field validation.
- `checklistProgress(template, answersByQuestion)` — N/M completion counts.
- `syncIndicator(pendingCount, online, stuckCount)`: the indicator tone and copy. `stuckCount` outranks everything, including being offline: a device holding stranded work reads red and says so. Offline with work waiting is amber, not red, because being out of signal is the normal state of a field device. Green means nothing is waiting and nothing is stuck.

## What a consuming app configures

`offlineConfig` on the integration descriptor. Every key is optional; the leaf
works with none of them set.

| Key               | What it decides                                                      |
|-------------------|----------------------------------------------------------------------|
| `plannedSchema`   | the schema holding the items to do today                             |
| `referenceSchema` | the schema holding the checklist templates                           |
| `resultSchema`    | the schema a completed checklist is written back to                  |
| `register`        | the register for the leaf's own bookkeeping; defaults to the operation's |
| `queueSchema`     | a schema holding queue records, for an app that wants the queue readable server-side |
| `conflictSchema`  | the schema holding conflict records                                  |

**Set `conflictSchema` or accept what follows.** Without it a collision is a
status on one row in one browser's IndexedDB: the colleague whose edit it
collided with never hears of it, the supervisor who has to decide cannot see it,
and the audit that has to show a decision was taken has nothing to read. The
inspector holding the phone is the only person who knows, and often the one
person who cannot settle it. The queue row says so rather than pretending
otherwise, but saying so is not the same as filing it.

## Daily-planning fetch contract

```
GET /apps/openregister/api/objects/{register}/{schema}?<planning filter>
```

The planning filter is built from the consuming app's config:

| Config key       | Purpose                                             |
|------------------|-----------------------------------------------------|
| `assigneeField`  | property holding the assignee (exact-match filter)  |
| `assignee`       | the assignee value (e.g. current user uid)          |
| `dateField`      | property holding the scheduled date                 |
| `date`           | the target day (defaults to today)                  |
| `extraFilters`   | any additional exact-match property filters         |

OR's `buildSearchQuery` consumes arbitrary property filters and its RBAC +
multitenancy scope the result to the caller, so no custom server endpoint is
required.
