# Design: manifest-offline-block

Read at nextcloud-vue development `3e606bf10`, with the open change
`offline-capture-queue-and-conflicts` in the same tree.

## What is there

- One IndexedDB database for every app on the origin,
  `conduction-offline-collection` (`src/integrations/offline/offlineDb.js:47`),
  with `objectCache`, `mutationQueue` and `meta` tables (`:121-123`).
  Dexie loads on first use only, and the header of the same file says
  why: a second Dexie on a page blanks whole apps.
- `storePlanning({ register, schema, items, collection, ttlMs })` writes a
  set and a `meta` row with `syncedAt` and `expiresAt`, `ttlMs`
  defaulting to 24 hours (`offlineDb.js:151-205`). `getPlannedItems`
  (`:216`), `getCachedObject` (`:235`) and `getPlanningMeta` (`:250`)
  read it back. There is no function that clears a set.
- `enqueueMutation({ deviceId, operationType, register, schema,
  targetId, payload })` queues a change (`offlineDb.js:268-284`), and
  `resolveDeviceId()` gives the device id (`:602`).
- `drainQueue(deviceId, offlineConfig)` replays every queued row of the
  device against `/apps/openregister/api/objects/{register}/{schema}`
  (`src/integrations/offline/syncReplayService.js:128-151`, the URL at
  `:33-35`). It cannot be limited to one app's rows.
- `fetchPlanning({ register, schema, extraFilters, limit })` fetches a
  set through the object API (`src/integrations/offline/planningFetch.js:87-91`,
  query at `:61-76`).
- `resolveFilterTokens(filter, ctx)` resolves `@me`, `@today` and the
  rest of the shared filter grammar (`src/utils/resolveFilterTokens.js:275`).
- `CnOfflineQueue` lists the queue, scoped by `deviceId`
  (`src/components/CnOfflineQueue/CnOfflineQueue.vue:215-218`).
- The shell worker never caches object reads: `NEVER_CACHED` holds
  `/apps/openregister/api/` (`src/offline/serviceWorker.js:38-42`).
- `CnFormPage` submits to `submitEndpoint` with axios or to a registered
  `submitHandler` (`src/components/CnFormPage/CnFormPage.vue:846-920`).
  It knows no register or schema.
- The manifest v2 schema has no `offline` key and refuses unknown
  top-level keys (`src/schemas/app-manifest-v2.schema.json:21`).

## Decisions

### D1. The `offline` block

```json
"offline": {
  "takeAlong": [
    { "register": "toezicht", "schema": "inspection",
      "filter": { "inspector": "@me", "plannedDate": "@today" },
      "limit": 50, "ttlHours": 12 }
  ],
  "forms": ["inspection-report"]
}
```

The shape is buildiq's D4 plus one key. `register` is added because the
cache is keyed by register and schema, and a schema slug is not unique
across registers. It may be left out when the pages that bind the
schema all use one register; the helper then takes that one.
`validateManifestV2` refuses an entry without `register` when pages bind
the schema in two registers, or in none. `filter` uses the
shared token grammar. `limit` is 1 to 500 and `ttlHours` 1 to 72, the
caps of buildiq's D4. Each `forms` entry names a `type: form` page.

Rejected: take-along flags on each index page. Two pages over the same
schema would each download it, and the maker thinks per schema, as
buildiq's settings screen does.

### D2. An offline form writes to a register and schema

The queue replays only against the OpenRegister object API. So a page
in `offline.forms` must declare `config.register` and `config.schema`.
Its `submitEndpoint` must be absent or that schema's object URL, and it
must not use `submitHandler`, because a handler is code the queue cannot
replay. `validateManifestV2` refuses any other offline form. buildiq's
D4 does not mention this; its form pages will need the two keys.

### D3. A take-along module in the offline core

`src/integrations/offline/takeAlong.js`:

- `TAKE_ALONG_COLLECTION = 'take-along'`, the collection every set is
  stored under, so the pages and the downloader agree.
- `downloadTakeAlong(manifest, ctx)`: for each entry, resolve `filter`
  with `resolveFilterTokens`, fetch with `fetchPlanning`, and store with
  `storePlanning` and `ttlMs = ttlHours * 3600000`. buildiq's runtime
  decides when to call it (its T05).
- `readTakeAlong(register, schema)`: `{ rows, syncedAt, expiresAt,
  expired }`. An expired set returns no rows.
- `clearTakeAlong(manifest)`: removes the declared sets and their `meta`
  rows, through a new `clearCollection(register, schema, collection)` in
  `offlineDb.js`.

The scoped clear is here because the database is shared: deleting it
from buildiq to clear one app would also wipe another app's queued field
work on the same device. buildiq's T05 clears on a load without a
session, and needs this to do it safely.

### D4. When a page counts as offline

A page is offline when `navigator.onLine` is false, or when its list or
object request fails without a response (status 0). It comes back when
the `online` event fires and a request succeeds. Only a page whose
manifest has an `offline` block ever opens the offline database.

### D5. The index and detail pages read from the device

`useOfflineTakeAlong({ register, schema })` gives `CnIndexPage` and
`CnDetailPage` the offline state and the set.

- `CnIndexPage`, offline, with a set for its register and schema, shows
  the stored rows in its current view mode. Text search and sort run on
  the stored rows. Facets, saved views and bulk actions are hidden. A
  bar says "You are offline. Showing 12 records downloaded at 08:14."
- `CnDetailPage`, offline, opens the record from the set, with the bar
  "You are offline. Downloaded at 08:14." Edit, delete and transitions
  are disabled with the tooltip "Not available offline."
- An expired set shows "The records on this device have expired.
  Connect to download them again." and no rows.
- A page without a set shows today's offline error, unchanged.

Rejected: answering reads from the service worker. The worker never
caches object reads (`NEVER_CACHED`), and a read the page takes from the
device should say so on the page.

### D6. An offline form queues its submission

When a page in `offline.forms` submits while offline, `CnFormPage` calls
`enqueueMutation` with `resolveDeviceId()`, `operationType` `create`
(or `update` with the route's id in `mode: "edit"`), the declared
register and schema, and the visible-field payload. It shows "Saved on
this device. It will be sent when you are back online." and emits
`queued` with the operation id. File fields are disabled while offline
with "Files cannot be sent offline." Validation runs as it does online.

### D7. The root sends its own queue

When the manifest has `offline.forms`, `CnAppRoot` calls `drainQueue` on
mount while online and on each `online` event. `drainQueue` gains an
optional `filter`, and the root passes one that keeps only rows whose
register and schema one of its offline forms writes. Another app's rows
on the same device wait for that app. The core's order, backoff and
conflict handling are unchanged.

## Files

- `src/schemas/app-manifest-v2.schema.json`, `src/utils/validateManifest.js`:
  the block, the caps, and the checks of D1 and D2.
- `src/integrations/offline/takeAlong.js`: new, D3.
- `src/integrations/offline/offlineDb.js`: `clearCollection`.
- `src/integrations/offline/syncReplayService.js`: the `filter` option.
- `src/integrations/offline/index.js`: exports.
- `src/composables/useOfflineTakeAlong.js`: new.
- `src/components/CnIndexPage/CnIndexPage.vue`,
  `src/components/CnDetailPage/CnDetailPage.vue`: D5.
- `src/components/CnFormPage/CnFormPage.vue`: D6.
- `src/components/CnAppRoot/CnAppRoot.vue`: D7.

## Privacy

Records on a device are copies outside the server's control until they
expire. The caps bound them, the pages refuse an expired copy, and
`clearTakeAlong` removes them. Whether an instance allows any of this is
buildiq's administrator setting (its D3). The worker still never caches
an object read.

## Accessibility

The offline bar is a status region, announced once when the page goes
offline and once when it comes back. The queued-form message takes
focus after submit, as the success message does today.
