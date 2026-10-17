# Proposal: related-sections

## Why

Board PqTicketGerelateerd draws a ticket's related items as one section per kind: Afspraken, Klant, Zaak and
Documenten, each with an icon, a count chip, an "Item koppelen" pill, rows with an Open link, and a dashed box with a
sentence when empty. CnRelatedObjectsWidget drew a tab per non-empty group, and merged every related object into one
Objects group.

## What changes

- `layout: "sections"` on CnRelatedObjectsWidget, with `sections[]` (`key`, `label`, `icon`, `group`, `schema`,
  `emptyText`, `action`). `schema` splits the objects group per kind.
- The detail page passes `content.layout` and `content.sections` to the widget.
- Without the layout the widget renders as before. No schema change (detail widget content is not schema-constrained).
