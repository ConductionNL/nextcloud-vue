---
kind: code
---

# Proposal: abstract-toggle-table

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract widgets. PtPortalInstellingen draws the sign-in
methods (Inlogwijze, Route, a switch) and "Zaaktypen die inwoners zien" (a title, a hint, a switch per case type, read
from the case types the portal could show) as tables of rows with a switch. The `toggle-table` widget
(CnToggleTableWidget) draws rows from a configured list or from a source, each with a switch bound to the current
object, plus optional extra columns.

Two ways to store a switch, both on the CURRENT object: one boolean field per row (`bind.mode: flag`, the row names its
field), or ONE array field holding the keys of the rows that are in it (`bind.mode: list`, with `invert` for a list of
hidden items shown as "visible" switches). A toggle saves at once with one PATCH of that field.

Existing widgets checked: `switch-rows` (#1519) has static rows and no columns or source; `field-list` edits a list of
objects with an add form; `table` and `object-list` show objects of a schema and do not write the current object.

## Scope

New widget, docs, unit tests, harness e2e. No schema change. Stacked on chips-field (#1524) and the settings widgets
before it.
