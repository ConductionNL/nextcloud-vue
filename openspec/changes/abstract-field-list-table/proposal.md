---
kind: code
---

# Proposal: abstract-field-list-table

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract widgets. PtPortalInstellingen draws "Domeinen" as a
table (Domein, Status pill, Certificaat, a "..." menu per row), an amber band under it for the domain waiting for
verification with a "Opnieuw controleren" button, and a "+ Domein toevoegen" button; "Inloggen" has "+ Inlogwijze
toevoegen" in the card header. `field-list` draws rows as a list. This change gives it a table variant instead of a
second widget: the stored list, the one-field PATCH, the add form, the row actions and `rowSource` stay the same.

## Scope

`content.variant: "table"` with `content.columns`; a per-row menu (row actions and remove) in the table variant; a
`detail` line drawn as a warning band under the table, with the row actions marked `placement: "band"`; the add form
opening from a button (`add.trigger: "button"`, `add.placement: "header" | "footer"`). Docs, unit tests, harness e2e.
No schema change. Without `variant` nothing changes. Stacked on choice-picker and the widgets before it.
