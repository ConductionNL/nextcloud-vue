# offline-field-capture Delta: offline-capture-queue-and-conflicts

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [offline-capture-queue-and-conflicts](../../)

## Purpose

The `field-inspection` leaf gains a queue an inspector can read, a
conflict that becomes an object in the register, a resolution somebody
can choose, and a shell that opens with no signal. Gap register row 16.1,
"Offline field capture with a visible replay queue and recorded
conflicts", rated partial for dossiq, under decisions D6 and D17.
Consumed by dossiq, which supplies the schemas in its `offlineConfig`.

## ADDED Requirements

### Requirement: The queued work is listed, not counted

The leaf SHALL render `CnOfflineQueue`, listing one row per queued
mutation for the current device. Each row SHALL name the operation, the
object it targets, the time it was queued, its status, the number of
attempts and the last error text the server returned. The list SHALL
update while a drain is running, and SHALL say so plainly when the queue
is empty. A pending count on its own SHALL NOT be the only surface.

#### Scenario: Three writes waiting, and what they are

- **GIVEN** a device with three queued mutations, two pending and one failed after four attempts
- **WHEN** the inspector opens the queue
- **THEN** three rows render, each naming its operation, target, queued time, status and attempt count, and the failed row shows the server's own error text

#### Scenario: The list moves while the queue drains

- **GIVEN** an open queue with two pending rows and a drain in progress
- **WHEN** the first row replays successfully
- **THEN** its status becomes synced in the list without the inspector reloading

#### Scenario: An empty queue says it is empty

- **GIVEN** a device with nothing queued
- **WHEN** the inspector opens the queue
- **THEN** an empty state says everything is synchronised, and no row renders

@e2e exclude the list, its columns and its empty state are component behaviour over an injected Dexie; covered by the offline unit suite.

### Requirement: A conflict is written to the register, not kept on the device

When a replay classifies a conflict and `offlineConfig.conflictSchema` is
set, the leaf SHALL write a conflict object to that schema in
`offlineConfig.register`, carrying the queue row's id as the queue
reference, the conflict type, the payload that was refused as the client
version and the body the server returned as the server version. That
write SHALL itself be queued, so a conflict classified while the
connection is failing is replayed later rather than dropped. When no
conflict schema is configured, the leaf SHALL keep the local conflict
status and SHALL state on the row that the conflict is recorded on this
device only.

#### Scenario: A concurrent edit becomes an object

- **GIVEN** a queued update whose replay returns 409 with the server's object in the body
- **WHEN** the drain processes it
- **THEN** a conflict object is written to the configured schema with type concurrent_edit, the queue row's id, the refused payload and the server's object

#### Scenario: The conflict write survives a dropped connection

- **GIVEN** a replay that conflicts and a connection that fails on the conflict write
- **WHEN** the device comes back online and drains again
- **THEN** the conflict object is written exactly once and is not duplicated by the retry

#### Scenario: No schema configured says so

- **GIVEN** an app that registers the leaf with no conflict schema
- **WHEN** a replay conflicts
- **THEN** the row shows the conflict and states that it is recorded on this device only, and no write is attempted

@e2e exclude the classification and the queued write are unit surfaces over a stubbed object API; the end to end path is dossiq's once it names its schemas.

### Requirement: A conflict is resolved from the queue, and a lost permission is not retried

A conflicted row SHALL offer keep mine, keep theirs and merge by hand,
each calling `resolveConflictChoice` with the matching resolution, and
SHALL apply the status the function returns. A row whose conflict type is
`permission_lost` SHALL offer no resolution and SHALL say that the right
to write this object is gone. A resolved conflict SHALL have its
resolution, the resolving user and the resolution time written onto the
conflict object.

#### Scenario: Keep mine requeues the write

- **GIVEN** a row conflicted as concurrent_edit
- **WHEN** the inspector chooses keep mine
- **THEN** `resolveConflictChoice('client_wins')` is called once, the row returns to pending, and the next drain replays it

#### Scenario: Keep theirs ends the row

- **GIVEN** a row conflicted as concurrent_edit
- **WHEN** the inspector chooses keep theirs
- **THEN** the row reaches a terminal status, is not replayed again, and the local cache holds the server's version

#### Scenario: A lost permission offers nothing to press

- **GIVEN** a row conflicted as permission_lost
- **WHEN** the inspector opens it
- **THEN** no resolution action is offered and the row states that the right to write this object is gone

#### Scenario: The resolution is recorded for the audit

- **GIVEN** a conflict object written for a resolved row
- **WHEN** the inspector resolves it
- **THEN** the object carries the chosen resolution, the resolving user and the resolution time

@e2e exclude every branch is a component action over the pure engine; covered by the offline unit suite.

### Requirement: A day of field work completes with no signal

With the browser reporting no connection, the leaf SHALL render the
cached planning, SHALL let a checklist be completed and evidence be
attached, and SHALL enqueue every write with the indicator reporting
queued work rather than an error. Nothing captured while offline SHALL be
lost across a reload of the page.

#### Scenario: A checklist finished in a cellar

- **GIVEN** a device with the day's planning cached and no connection
- **WHEN** the inspector completes a checklist and attaches evidence
- **THEN** both are queued, the indicator reports queued work, and no error is shown

#### Scenario: A reload loses nothing

- **GIVEN** queued work captured with no connection
- **WHEN** the page is reloaded, still with no connection
- **THEN** the queue still holds every captured item and the planning still renders

#### Scenario: The planning expires rather than going stale in silence

- **GIVEN** a cached planning past its offline lifetime
- **WHEN** the inspector opens the leaf with no connection
- **THEN** the planning is shown as out of date with the time it was downloaded, rather than rendered as current

@e2e exclude offline capture is exercised against an injected Dexie and a forced offline flag in the unit suite; the browser path is the consuming app's.

### Requirement: The shell opens with no signal, when the host opts in

The library SHALL ship a service worker and a registration helper. The
helper SHALL register the worker only when the host calls it, and SHALL
do nothing when the browser has no service worker support. The worker
SHALL serve the app shell and the built bundle from cache when the
network is unavailable, SHALL never serve an object read from cache, and
SHALL replace its cache when the bundle version changes.

#### Scenario: The page opens on a dead connection

- **GIVEN** a host that registered the worker and loaded the app once
- **WHEN** the app is opened again with no connection
- **THEN** the shell and the bundle are served from cache and the leaf renders its cached planning

#### Scenario: An object read is never answered from cache

- **GIVEN** a registered worker and a request to the OpenRegister object API
- **WHEN** the request is made
- **THEN** the worker passes it to the network and does not answer it from cache

#### Scenario: A new bundle version replaces the cache

- **GIVEN** a cached shell from an earlier bundle version
- **WHEN** the app loads a newer version
- **THEN** the old cache is discarded and the new shell is cached in its place

#### Scenario: A host that does not opt in registers nothing

- **GIVEN** a host that never calls the helper
- **WHEN** the app loads
- **THEN** no service worker is registered and every request goes to the network

@e2e exclude worker registration and its cache strategy are unit tested against a stubbed service worker container; a real worker needs a served origin, which is the consuming app's suite.
