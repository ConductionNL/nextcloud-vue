---
kind: code
---

# Proposal: abstract-field-list

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract widgets.

portaliq #1491 added `PortalDomains` and `PortalEditors` because no library widget edits a list stored inside one
field of the current object (`portal.domains[]` with a per-row state, a TXT record line and a "check again" request;
`portal.editors[]` with a role). The same shape recurs wherever an object keeps a small list of its own (contact
channels, a case type's party kinds, bank accounts).

This change adds the `field-list` widget (CnFieldListWidget): rows drawn from configuration, an add form, remove, row
actions calling a configured request, live per-row state from an endpoint merged by key, and every change saved as ONE
PATCH of that field after re-reading the stored value.

## Scope

New widget, docs, unit tests, harness e2e. No schema change. Writes go to OpenRegister's object endpoint; the server's
RBAC decides, the widget shows a refusal in the server's words.

## Out of scope

Migrating portaliq (lane A's migrate-portaliq.md). Reordering entries; a user picker field type (text for now).
