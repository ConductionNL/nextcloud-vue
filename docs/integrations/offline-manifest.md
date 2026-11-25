---
sidebar_position: 7
---

# Offline manifest

A manifest can say which records an app takes along to the device and which
of its forms work without a connection. Index and detail pages then read the
taken-along records from the device, with the time they were downloaded, and
an offline form queues its submission until the connection is back.

The block is opt-in. A manifest without `offline` never opens the offline
database, and every page behaves as before.

## The block

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

`takeAlong` entries:

| Key | Required | Meaning |
|-----|----------|---------|
| `schema` | yes | Schema slug of the records to take along. |
| `register` | no | Register slug. Leave it out when every page that binds the schema uses one register; that register is taken. `validateManifestV2` refuses the entry when pages bind the schema in two registers, or in none. |
| `filter` | no | Exact-match filters in the shared token grammar (`@me`, `@today`, `@monthStart`, ...), resolved at download time. |
| `limit` | no | At most this many records, 1 to 500 (100 when left out). |
| `ttlHours` | no | How long the copy stays usable, 1 to 72 hours (24 when left out). An expired copy is never shown. |

`forms` lists the ids of `type: form` pages that work offline.

## The form rule

A queued submission is replayed against the OpenRegister object API, nothing
else. So an offline form:

- declares `config.register` and `config.schema`;
- uses no `submitHandler` (a handler is code the queue cannot replay);
- has no `submitEndpoint`, or one that is that schema's object URL
  (`/apps/openregister/api/objects/{register}/{schema}`, with `/:id` for an
  edit form).

`validateManifestV2` refuses any other offline form, naming the page. A form
that names only its register and schema posts to their object URL online
(`PUT` to the route's record in `mode: "edit"`).

## What the pages do

| Page | Offline, with a downloaded set |
|------|--------------------------------|
| Index | Shows the downloaded rows in its view mode with "You are offline. Showing 12 records downloaded at 08:14.". Search and sort run on the device; selection and saved views are off. An expired set shows "The records on this device have expired. Connect to download them again." and no rows. |
| Detail | Opens the record from the set with "You are offline. Downloaded at 08:14.". Edit and every action in the menu are disabled with "Not available offline.". |
| Form (listed) | Validates as online, queues the visible fields (`create`, or `update` of the route's record in edit mode), shows "Saved on this device. It will be sent when you are back online." and emits `queued`. File fields are disabled with "Files cannot be sent offline.". |

A page counts as offline when `navigator.onLine` is false, or when its own
request failed without any answer. A page without a downloaded set shows the
offline error it showed before.

`CnAppRoot` sends the queue on mount while online and on each `online` event,
limited to the register and schema pairs its offline forms write. Another
app's queued rows on the same device wait for that app.

## What the host still does

The library knows how to download, read and clear a set; the host decides
when. Import from `@conduction/nextcloud-vue/src/integrations/offline` (also
reachable as `offlineCollection` from the package root):

```js
import { offlineCollection } from '@conduction/nextcloud-vue'

// On a signed-in load, while online:
await offlineCollection.downloadTakeAlong(manifest)

// On a load without a session (signed out on a shared device):
await offlineCollection.clearTakeAlong(manifest)
```

- `downloadTakeAlong(manifest, ctx?)` resolves each entry's filter tokens,
  fetches at most `limit` records and stores them under the `take-along`
  collection with the `ttlHours` expiry. It returns one outcome per entry;
  one failing entry does not stop the others.
- `readTakeAlong(register, schema)` returns `{ rows, syncedAt, expiresAt, expired }`;
  an expired set has no rows.
- `clearTakeAlong(manifest)` removes only this app's declared sets, through
  `clearCollection(register, schema, collection)`. The database is shared by
  every app on the origin, so deleting it would also drop another app's
  queued field work.
- The shell worker (`registerOfflineWorker`) keeps the app itself loadable
  offline. It never caches object reads: records reach a page only through a
  take-along set, which says so on the page.

## Privacy

Records on a device are copies outside the server's control until they
expire. The caps bound them, the pages refuse an expired copy, and
`clearTakeAlong` removes them. Whether an instance allows any of this is the
host's decision (buildiq: an administrator setting).
