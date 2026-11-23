# manifest-offline Delta: manifest-offline-block

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [manifest-offline-block](../../)

## Purpose

A manifest declares which records an app takes along and which forms
work offline. Without a connection, index and detail pages read the
taken-along records from the device with their download time, and an
offline form queues its submission. The library half of buildiq
`pages-installable-offline-and-mobile` (its T07, D4, REQ-BQOM-003 and
REQ-BQOM-004); rows `pg-offline` and `pg-native-mobile` (buildiq
matrix).

## ADDED Requirements

### Requirement: The manifest declares what goes offline

The manifest v2 schema SHALL accept a top-level `offline` object with
`takeAlong` (entries of `register`, `schema`, `filter`, `limit` from 1
to 500 and `ttlHours` from 1 to 72) and `forms` (page ids).
`validateManifestV2` SHALL refuse a `takeAlong` entry without `register`
when pages bind its schema in two registers or in none, a `forms` entry
that is not a `type: form` page, and an offline form without
`config.register` and `config.schema`, with a `submitHandler`, or with a
`submitEndpoint` other than that schema's object URL.

#### Scenario: A take-along over the cap is refused

- GIVEN a manifest with a take-along of schema `inspection` and `limit: 800`
- WHEN `validateManifestV2` runs
- THEN it fails saying the limit is at most 500

#### Scenario: A handler form cannot be offline

- GIVEN `offline.forms: ["report"]` and page `report` submitting through `submitHandler`
- WHEN `validateManifestV2` runs
- THEN it fails naming `report` and saying an offline form writes to a register and schema

### Requirement: The offline core downloads, reads and clears a take-along set

The offline core SHALL export `downloadTakeAlong(manifest, ctx)`, which
resolves each entry's filter tokens, fetches at most `limit` records and
stores them under one collection with an expiry of `ttlHours`;
`readTakeAlong(register, schema)`, which returns the rows, the download
time and the expiry, and no rows once expired; and
`clearTakeAlong(manifest)`, which removes only the declared sets.

#### Scenario: Today's inspections go along

- GIVEN a take-along of `inspection` with filter `{ inspector: "@me", plannedDate: "@today" }`, 50 records, 12 hours
- WHEN the host calls `downloadTakeAlong` for inspector `jvdberg` in the morning
- THEN her inspections for today are stored with the download time and an expiry 12 hours later

#### Scenario: Clearing one app leaves another app's queue

- GIVEN a device holding the take-along of `toezicht` and a queued field inspection of another app
- WHEN `clearTakeAlong` runs for `toezicht`
- THEN the take-along is gone and the other app's queued inspection is still there

### Requirement: Index and detail pages read from the device when offline

When the connection is gone, `CnIndexPage` SHALL show the unexpired
take-along rows of its register and schema, with search and sort on
those rows and a status bar naming how many records and when they were
downloaded. `CnDetailPage` SHALL open a record from the set with its
download time and SHALL disable edit, delete and transitions. An expired
set SHALL show "The records on this device have expired. Connect to
download them again." A page whose manifest has no `offline` block
SHALL NOT open the offline database.

#### Scenario: An inspector opens an inspection in a basement

- GIVEN an inspector with today's inspections downloaded at 08:14, and no signal
- WHEN she opens the inspections list and then "Kerkstraat 12"
- THEN the list says "You are offline. Showing 12 records downloaded at 08:14."
- AND the inspection opens with "Downloaded at 08:14." and its edit button disabled

#### Scenario: An expired copy is not shown

- GIVEN a take-along downloaded yesterday with a 12-hour expiry, and no signal
- WHEN the inspector opens the list
- THEN no records show and the page says they have expired

### Requirement: An offline form queues its submission and the root sends it

When a page in `offline.forms` is submitted while offline, `CnFormPage`
SHALL validate as online, queue the visible-field payload through
`enqueueMutation` with the device id, the declared register and schema,
and `create`, or `update` in edit mode, and SHALL show "Saved on this
device. It will be sent when you are back online." File fields SHALL be
disabled while offline. `CnAppRoot` SHALL drain the queue on mount when
online and on each `online` event, limited to the register and schema
pairs its offline forms write.

#### Scenario: A report made without signal arrives later

- GIVEN the offline form "Inspection report" and no signal
- WHEN the inspector fills it in and submits, and later walks outside
- THEN the form says it is saved on the device
- AND once the connection returns the report is created in OpenRegister and leaves the queue

#### Scenario: The root leaves another app's queue alone

- GIVEN a device with a queued report of `toezicht` and a queued field inspection of another app
- WHEN `toezicht` comes back online
- THEN only the report is sent
