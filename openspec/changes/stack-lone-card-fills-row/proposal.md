# Proposal: stack-lone-card-fills-row

## Why

A tab stack's `layout` sets widgets beside each other (dossiq's Overview: Priority and Locations at half width each).
When a record hides one of them through its `visibleWhen`, the other is left at half width beside a hole. DqZaakLocatie
draws Locations across the whole row for a case type that has no Priority card; COMPDIFF r19 measures it 390px wide
against 800.

## What changes

A widget `layout` places that ends up alone in its row takes the whole row. A row shared as declared keeps its widths,
and a `columns` share is left as it is.

## Scope

Gridded tab stacks only.
