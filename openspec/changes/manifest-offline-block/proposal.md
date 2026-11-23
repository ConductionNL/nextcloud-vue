---
kind: code
depends_on: []
---

# Proposal: manifest-offline-block

## Why

An inspector opens the inspection app in the morning, walks into a
basement and loses signal. She still needs today's inspection and the
report form. The library can already keep records on a device, queue a
change and send it later: that is the offline core under
`src/integrations/offline/`. Only the `field-inspection` leaf uses it.
An index, detail or form page built from a manifest shows an error the
moment the connection drops, and a manifest has no way to say what an
app takes along.

This change lets a manifest declare what goes offline, and makes the
three page types read from the device when the network is gone.

## Rows

No gap row in this lane's list names this. The sibling change waiting on
it is buildiq `pages-installable-offline-and-mobile`. Its proposal,
section "Sibling halves":

> nextcloud-vue owes the generic wiring. Its offline core serves the
> `field-inspection` leaf only. `CnFormPage`, `CnDetailPage` and
> `CnIndexPage` need to read an `offline` block from the manifest: list
> and open taken-along records from the offline cache with their
> download time when there is no connection, and queue a form submission
> through `enqueueMutation()` instead of failing. The manifest schema
> (`app-manifest-v2.schema.json`) needs that `offline` block.

Its design D4 gives the block:
`offline: {takeAlong: [{schema, filter, limit, ttlHours}], forms: [pageId]}`,
capped at 500 records and 72 hours. Its task T07 asks for this change.
Its REQ-BQOM-003 and REQ-BQOM-004 wait on it.

The rows that change covers:

| matrix | row | name |
|---|---|---|
| buildiq | `pg-offline` | Let users keep working in an app while offline and sync later. |
| buildiq | `pg-native-mobile` | Build a native mobile app for iOS or Android from the same design. |

## What changes

- The manifest v2 schema gains a top-level `offline` block:
  `takeAlong` and `forms`, with the caps of buildiq's D4.
- The offline core gains a take-along helper: download a declared set,
  read it back with its download time and expiry, and clear it.
- Without a connection, `CnIndexPage` lists the taken-along records of
  its register and schema, and `CnDetailPage` opens one, each with the
  time it was downloaded. An expired copy is not shown.
- Without a connection, a form page listed in `offline.forms` queues its
  submission through `enqueueMutation()` and says it will be sent later.
- `CnAppRoot` sends the queued submissions of its own offline forms when
  the connection returns.

## What the open change already covers

`offline-capture-queue-and-conflicts` specifies the queue screen
`CnOfflineQueue`, conflicts written to the register and resolved from
the queue, capture with no signal for the `field-inspection` leaf, and
the shell service worker. This change reuses all of it and specifies
none of it again. It adds the manifest block and the three generic
pages.

## Affected projects

- `nextcloud-vue`: the manifest v2 schema, `validateManifestV2`,
  `src/integrations/offline/` (a take-along module, a scoped clear, a
  drain filter), a new `useOfflineTakeAlong` composable, `CnIndexPage`,
  `CnDetailPage`, `CnFormPage`, `CnAppRoot`.
- Consumers: buildiq. Any app can declare the block.

## Cross-project dependencies

buildiq owes the rest of its T05: registering the worker, deciding when
to download the take-along sets (with the helper here), and clearing
them when the app loads without a session.

## Backward compatibility

A manifest without `offline` behaves exactly as before, and the pages
never open the offline database, so Dexie is not loaded.

## Out of scope

- Editing existing records offline outside a declared form.
- File fields in an offline form. They are disabled while offline.
- The queue screen, conflicts and the worker: the open change above.
- Showing only one app's submissions in `CnOfflineQueue`. On a device
  with two offline apps, each queue screen lists both.
