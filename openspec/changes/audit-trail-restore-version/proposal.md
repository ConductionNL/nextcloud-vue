---
kind: code
depends_on: []
---

# Proposal: audit-trail-restore-version

## Why

A case handler sets a permit to "rejected" by mistake. The record's
history shows exactly what it was before, and she cannot put it back.
She has to retype every field by hand. OpenRegister can already restore
a record to the state after any history entry, and saves that as a new
version, so nothing is lost. The library shows the history in
`CnAuditTrailTab` and offers no way to use it.

## Rows

No gap row in this lane's list names this. The sibling change waiting on
it is buildiq `data-restore-record-version`. Its proposal, section
"Sibling halves":

> nextcloud-vue owes the button. `CnAuditTrailTab`
> (`src/components/CnObjectSidebar/CnAuditTrailTab.vue` at 2.57.1) lists
> entries with an expandable detail and no action. It needs an
> `allowRestore` prop, default `false`, that adds "Restore this version"
> to an expanded entry, asks for confirmation, calls the revert route
> with that entry's `auditTrailId`, and reloads the record and the list.

Its design D3 adds the messages: "You cannot restore this record." for
403, and the lock holder's name for 423. Its task T03 asks for all of it
with a spec here. Its REQ-BQRR-003 and REQ-BQRR-004 wait on it.

The archived `version-diff-viewer` change left this open on purpose:
"a 'restore this version' action can consume it in a follow-up, not part
of this change."

The row that change covers:

| matrix | row | name |
|---|---|---|
| buildiq | `data-restore-record` | Restore a record to an earlier state. |

## What changes

- `CnAuditTrailTab` takes `allowRestore`, default `false`.
- With it on, an expanded `create` or `update` entry shows "Restore this
  version". The button is hidden when the record says its reader may not
  update it.
- A click opens the library's `CnConfirmDialog`. Confirming calls
  OpenRegister's revert route with the entry's `auditTrailId`.
- After a restore the tab reloads its list and announces a page refresh,
  so the detail page re-reads the record.
- A refusal shows a fixed sentence: no rights, locked by a named person,
  gone, or failed. Never the server's own text.

## Affected projects

- `nextcloud-vue`: `CnAuditTrailTab`, and a small `useRestoreVersion`
  composable.
- Consumers: buildiq writes `allowRestore` on its history tab (its D1).
  Any app can pass it on a sidebar `audit` widget.
- OpenRegister: nothing new. It serves the route today.

## Backward compatibility

`allowRestore` defaults to `false`. Every tab rendered today, including
the built-in audit tab of `CnObjectSidebar`, shows no button.

## Out of scope

- Restoring a deleted record. OpenRegister's `deleted#restore` covers
  it.
- Restoring one field, or restoring by date or version number. The
  route accepts both; the tab restores by entry.
- A restore button in `CnVersionHistory`. It can use the same composable
  in a later change.
