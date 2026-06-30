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
- `countPending(deviceId?)` — count not-yet-synced queue operations.
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
- `syncIndicator(pendingCount, online)` — online / all-synced / queued / conflict tone + copy.

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
