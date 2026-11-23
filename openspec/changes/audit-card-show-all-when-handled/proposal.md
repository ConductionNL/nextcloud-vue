# Proposal: audit-card-show-all-when-handled

## Why

A history card that holds more entries than it shows ends in a "Show all (n)" footer. `CnAuditTrailCard` emits
`show-all` and leaves the rest to its host, but the audit-trail widget, which draws every history card on a manifest
detail page, binds no listener. On DqZaaktype "Historie" and the Pipelinq side cards "Geschiedenis" (PqKassabon,
PqKassadienst, PqMailinglijst, PqOfferte) the button did nothing, and its Nextcloud footer (a rule and a 16px inset)
drew a row the boards do not have.

## What changes

`CnAuditTrailCard` draws the show-all footer only when its host listens for `show-all`. A host that binds the event
keeps the footer and the event as before.

## Reach

Every look. No schema change. A host with a listener sees no change.
