# audit-trail-restore Delta: audit-trail-restore-version

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [audit-trail-restore-version](../../)

## Purpose

A person who may edit a record restores it, from its history, to the
state after an earlier change. OpenRegister saves that as a new version.
The library half of buildiq `data-restore-record-version` (its T03, D3,
REQ-BQRR-003 and REQ-BQRR-004); row `data-restore-record` (buildiq
matrix).

## ADDED Requirements

### Requirement: The audit trail tab offers a restore only when asked

`CnAuditTrailTab` SHALL accept `allowRestore`, default `false`, and
`objectData`. With `allowRestore` on, an expanded entry whose action is
`create` or `update` SHALL show "Restore this version". The button SHALL
be hidden when `objectData['@self'].actions` is an array without
`update`, and SHALL be disabled with the holder's name when someone else
holds the record's lock. With `allowRestore` off, no entry SHALL show
the button.

#### Scenario: A page without restore shows no button

- GIVEN a permit's history tab rendered without `allowRestore`
- WHEN a case handler expands an entry
- THEN the entry shows its changes and no "Restore this version"

#### Scenario: A reader without update rights sees no button

- GIVEN a history tab with `allowRestore: true` and a permit whose `@self.actions` is `["read"]`
- WHEN the reader expands an update entry
- THEN no "Restore this version" is shown

### Requirement: A confirmed restore calls the revert route with the entry id

Choosing "Restore this version" SHALL open `CnConfirmDialog` asking
"Restore this version?" with the entry's date and user, and saying the
restore is a new version that removes nothing. Confirming SHALL post
`{ auditTrailId: <entry id> }` to
`/apps/openregister/api/objects/{register}/{schema}/{id}/revert`. On
success the tab SHALL reload its list from the first page, emit
`restored` with the returned record, and emit `cn:page:refresh`, so the
detail page shows the restored values.

#### Scenario: A case handler undoes a wrong status change

- GIVEN a permit whose status went from "in review" to "rejected" by mistake, on a history tab with `allowRestore: true`, and a case handler with update rights
- WHEN she expands the entry that set "in review", chooses "Restore this version" and confirms
- THEN the request carries that entry's `auditTrailId`
- AND the permit shows "in review", and the history lists the restore first with the "rejected" entry still below it

### Requirement: A refusal shows a fixed sentence and changes nothing

A 403 SHALL show "You cannot restore this record." A 423 SHALL reload
the record and show "This record is locked by {name}." with the lock
holder, or "This record is locked by someone else." without one. A 404
SHALL show "This record no longer exists." Any other failure SHALL show
"The record could not be restored." The tab SHALL NOT show the server's
own message.

#### Scenario: A locked record refuses the restore

- GIVEN a permit locked by colleague Sanne after the tab loaded
- WHEN a case handler confirms a restore
- THEN the server answers 423 and the dialog says "This record is locked by Sanne."
- AND the permit is unchanged
