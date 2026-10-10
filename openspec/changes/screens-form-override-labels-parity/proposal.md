---
kind: code
---

# Proposal: screens-form-override-labels-parity

## Summary

dossiq DqNieuweZaak (round6/dossiq/library-gaps.md 18): the new case form
showed "Requester" for the field the manifest relabels through
`fieldOverrides.requester.label`, although dossiq's Dutch catalogue holds
"Aanvrager". `fieldsFromSchema` translates a schema property's title and
description, then merges the override in raw, so every label, helper line and
placeholder a manifest writes in an override stayed in the source language.
The board also writes the optional-field suffix as "(niet verplicht)"; the
library's Dutch had none.

## What changes

1. `fieldsFromSchema` runs an override's `label`, `description` and
   `placeholder` through the same translate function as the schema text. Every
   surface on this pipeline gets it: CnFormDialog, CnObjectDataWidget.
2. The Dutch catalogue renders the library's `optional` suffix as
   "niet verplicht" (the board canon).

No look switch: with no translate function, or text no catalogue knows, the
field reads as before.

## Not in this change

- The board's title "Nieuwe zaak": the app sets the open-form `formTitle`.
- Raw enum values ("manual"): the app gives the property `x-enum-labels`, or
  the override `enumLabels`; both are translated already.
- The eyebrow and intro line above the fields: new open-form keys, schema
  2.84.0, a separate change.
