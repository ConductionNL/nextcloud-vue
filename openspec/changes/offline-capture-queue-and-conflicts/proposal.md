---
kind: code
---

# Proposal: offline-capture-queue-and-conflicts

## Summary

The `field-inspection` leaf is a nextcloud-vue builtin and it owns the
offline half of field work for the whole fleet. It caches a planning, it
queues a mutation and it drains the queue on reconnect. What it does not
do is show the queue, record a conflict anywhere the office can read it,
or let anybody resolve one. `syncQueueEngine.js` exports
`classifyConflict`, `isConflictRetryable` and `resolveConflictChoice`,
all three unit tested, and not one of them has a caller outside its own
test. The leaf renders a count and a coloured word.

This change gives the leaf a queue somebody can look at, a conflict that
becomes an object in the register rather than a row in one device's
IndexedDB, a resolution the inspector can choose, and a shell that still
opens when there is no signal.

## The row it closes

Row **16.1**, "Offline field capture with a visible replay queue and
recorded conflicts", rated **partial** for dossiq, area "Field work and
offline".

Source, the ledger `source` field verbatim:

```
dossiq#2314, published as 16.1
```

The ledger note, dossiq's own evidence, verbatim:

> dossiq registers the field-inspection leaf with its own offline config, and the leaf owns the queue and the replay. Its own Dexie store, sync queue engine, replay service and controller were deleted, so conflictRecord has no reader and an inspector still cannot work without a signal.

The corpus batch file
`procest/_round4/compare/proposed-rows-dossiq-2026-09-10.md` in
ConductionNL/market-intelligence, table row verbatim:

```
| proposed | in dossiq | capability | dossiq | competitors | cross-reference |
| **16.1** | 16.1 | Offline field capture with a visible replay queue and recorded conflicts | partial | unread |  |
```

## What the competitor evidence actually is

There is none, and the corpus says so in as many words. From the same
batch file:

> **Every competitor column is `unread`, and none of them is `no`.** The corpus columns are
> GLPI, Zammad, OpenProject, Plane, Redmine, Forgejo, osTicket, FreeScout, Znuny, GitLab, OTOBO,
> iTop, Odoo, Deck, Kanboard, Vikunja, RT, Helpdesk, Gitea, Taiga, Tuleap, Huly, JSM, YouTrack,
> Jira DC, Easy Redmine, OpenCase, GZAC, xxllnc Zaken and Dimpact ZAC.
> Not one of them has been read against a row below. `unread` is what the ledger writes for
> that, and the distinction is the whole point: `no` is a reading of a product somebody
> opened, and filling these cells with it would fabricate thirty readings per row.

So this change is argued from dossiq's own tree and from the code in this
repository, not from a product anybody opened. The row enters under
**D6**, every gap that matters enters, and it is not dropped for being a
municipal inspection scenario under **D17**, a market that is
municipalities and MKB alike. A contractor with four vans and no office
has the same queue as a handhaver.

## The evidence in this repository

- `src/integrations/offline/offlineDb.js` holds three Dexie tables,
  `objectCache`, `mutationQueue` and `meta`. `countPending` counts rows
  with status `pending`, `conflict` or `syncing`. Nothing lists them.
- `src/integrations/offline/syncQueueEngine.js` classifies a 409 or a 404
  into `concurrent_edit`, `deleted_remote` or `permission_lost`, and
  `resolveConflictChoice` maps `client_wins`, `server_wins` and
  `manual_merge` onto a next status. `grep -rn resolveConflictChoice src`
  returns the definition and the barrel export, and no call site.
- `src/integrations/offline/syncReplayService.js` writes the conflict
  onto the local queue row and returns a tally. It writes nothing to
  OpenRegister.
- `CnFieldInspectionCard.vue` and `CnFieldInspectionTab.vue` call
  `countPending` and `syncIndicator` and render `Conflict` as a label.
  Neither offers an action on a conflicted row.
- dossiq declares the reader's data model already, in
  `lib/Settings/register.d/40-mobiel-inspectie-offline.json`: the
  `syncQueue` schema and the `conflictRecord` schema, the latter carrying
  `syncQueueRef`, `serverVersion`, `clientVersion`, `conflictType`,
  `resolution`, `resolvedBy` and `resolvedAt`, and described as recording
  a conflict "plus its resolution for AVG audit". Both schemas are listed
  on the `dossiq` register, so they resolve. Nothing writes to either.

That is the shape of the gap. The decisions are made and the vocabulary
is declared. The device keeps the answer to itself.

## The ADRs it cites

Opened and read for this proposal:

- **ADR-019, integration registry pattern.** The leaf is registered by id
  on both sides and a consuming app overrides the same id to supply its
  own configuration. The queue surface is part of the leaf, so it reaches
  every app that registers the id, and no app gets a private copy.
- **ADR-066, narrow lifting of the ADR-041 moratorium.** A leaf renders
  and reads. It is not an RPC bus. The conflict record is written through
  OpenRegister's own object API with the host's register and schema, not
  by calling into dossiq.
- **ADR-070, OpenRegister-backed persistence is the default.** IndexedDB
  here is a device cache and a replay buffer, never the record. A
  conflict that only exists in Dexie is a record kept off OpenRegister
  with no exception ADR behind it, which is exactly what this change
  ends.
- **ADR-032, spec sizing and chaining.** This is `kind: code`, and the
  service worker is chained behind the queue rather than folded into the
  same task.

## What nextcloud-vue builds

- **A queue surface.** `CnOfflineQueue`, a component the leaf renders,
  listing one row per queued mutation: what it is, the object it targets,
  when it was queued, its status, how many attempts it has had and the
  last error the server gave. It updates while a drain runs.
- **A conflict that is recorded.** When a replay classifies a conflict,
  the leaf writes a conflict object to the schema the host names in
  `offlineConfig.conflictSchema`, carrying both versions, the type and
  the queue reference, and it queues that write like any other so a
  conflict found offline is not lost.
- **A resolution somebody can choose.** A conflicted row offers keep
  mine, keep theirs, or merge by hand, wired to `resolveConflictChoice`.
  A `permission_lost` conflict offers no retry and says why, because
  `isConflictRetryable` already says it is not retryable.
- **Capture that works with no signal.** The day's planning is readable,
  a checklist can be completed and every write enqueues, with the
  indicator saying so, while `navigator.onLine` is false, and none of it
  is lost across a reload.
- **A shell that opens with no signal.** The library ships a service
  worker and a registration helper. The host serves the worker at its own
  scope and opts in. Without it the inspector cannot reach the page at
  all, which is the second half of the ledger note.

## How dossiq consumes it

dossiq already registers the `field-inspection` id with its own
`offlineConfig` in `src/main.js`, and the file says so: "dossiq only
supplies its `offlineConfig` so the generic core points at dossiq's
schemas". Its half of this row is three more keys in that bag,
`queueSchema`, `conflictSchema` and the register they live in, pointing
at the `syncQueue` and `conflictRecord` schemas its own register fragment
already declares, plus serving the worker at `/apps/dossiq/`. There is no
dossiq change on `development` holding that half today, so it is to be
specified in dossiq. The office side, a list of open conflicts for a
coordinator who is not the inspector, is a page over the
`conflictRecord` schema and is dossiq's too.

## Affected projects

- `nextcloud-vue`: `src/integrations/offline/`, the two
  `field-inspection` components, a new `CnOfflineQueue` under
  `src/components/`, a worker under `src/offline/`.
- Consumers: dossiq today. Any app registering the `field-inspection` id
  inherits the surface. No other consumer changes.

## Backward compatibility

`offlineConfig` gains optional keys. An app that names no conflict schema
keeps today's behaviour, a local conflict status and no object written,
and the queue surface tells the user the conflict is on this device only.
The service worker is opt-in and absent by default. No export is removed
and no prop loses its default.

## Theming

The queue surface and the status chips use Nextcloud CSS variables only.
The status colours come from the same `syncIndicator` states the leaf
already renders, so nldesign overrides them without the component
knowing.

## Existing specs it extends

None. The offline core has shipped in `src/integrations/offline/` with no
OpenSpec requirement of any kind behind it, which is part of why the
conflict path could lose its reader without a test noticing. This change
opens `offline-field-capture` as its capability and specifies the core it
inherits alongside the behaviour it adds.

## Size

L. A new surface, a new write path to OpenRegister, and a service worker
the library has never shipped.

## Dependencies

The host's register and schemas are OpenRegister's, and dossiq's fragment
already declares them. Nothing in this change waits on another change in
this repository.

## Out of scope

- Deciding what a conflict is. `classifyConflict` already decides, from
  the status code the server returned.
- A merge editor for arbitrary schemas. Merge by hand opens the two
  versions and lets the user pick per field on the schemas the leaf
  already renders as a checklist.
- Background sync while the tab is closed. The worker caches the shell.
  The replay runs when the app runs.
- The office view of open conflicts. That is a page in the consuming app.
