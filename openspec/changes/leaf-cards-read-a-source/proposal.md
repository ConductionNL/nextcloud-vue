# Proposal: leaf-cards-read-a-source

## Why

dossiq's task page (DqTaak) keeps three cards of its own, notes, appointments and history, because the library's
CnNotesCard and CnAuditTrailCard only build an OpenRegister object URL and there is no events card. A flow task is not
an object: its leaves live at `/api/flow-tasks/{uuid}/notes|events|audit`. openregister `FlowTaskDetail` and every app
with a task page need the same three cards.

## What changes

CnNotesCard and CnAuditTrailCard take `source: { kind: 'flow-task', id? }` or a plain `endpoint`, resolved by one
helper (`leafSourceUrl`); an absent `id` or `@objectId` takes the page's record. A new CnEventsCard (widget type
`events`) lists a source's appointments. In source mode a failed read says so instead of showing an empty list, a
refused note write shows the server's sentence, a note with `isCurrentUser` may be deleted by its author, and the audit
rows read oldest first with the state reached, the performer kind, on whose behalf and "(refused)". The `notes`
integration and the `audit-trail` widget pass `source` and `endpoint` through.

## Scope

Additive: without the new keys every component behaves as before.
