---
kind: code
---

# Proposal: screens-tab-counts-parity

## Summary

The detail boards draw a count in each tab: "Documenten 7, Contact 4, Taken 4,
Historie 10" on DqZaak, "Zaken 2, Tickets 2, Contactmomenten 3, Bestanden 4"
on DqContact, "Sessies 3, Berichten 2" on PtAccount
(round6/dossiq/library-gaps.md 14 and 19, round6/portaliq/library-gaps.md 19).
CnTabsWidget takes `count` (a literal) or `countField` (a field of the record),
but none of those records carries the number. The child widget's own list does:
an object-list widget names its register, schema and filter.

## What changes

A tab entry in a `tabs` widget takes `countFrom`:

- `"widget"` counts the child widget's own list (`content.register`,
  `content.schema`, `content.filter`, with `@objectId` and other filter tokens
  resolved against the record);
- an object `{ register, schema, filter? }` names the list.

The widget counts through the list endpoint (`fetchListTotal`, `_limit=1`,
the response's `total`) on mount, when the record changes and on a page or
widget refresh. `count` and `countField` win over it. A failed count, or a
child without a list, shows no number. The tab entries are widget content,
which the manifest schema does not describe, so there is no schema change.

A tab without `countFrom` renders and requests exactly as before.
