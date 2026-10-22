# Proposal: object-list-table-bleed

## Why

COMPDIFF r22 measured object-list tables in detail cards with their column text 35px into the card, where the case-tab
boards draw it 23px in, in line with the card title (DqZaakContact "Contactmomenten op deze zaak", DqZaakGerelateerd
"Objecten" and "Deelzaken"). Those boards draw the table edge to edge: it runs under the card's side padding and its
first cell takes that padding. Other boards draw the table inside the padding (DqTenant "Mandaten", DqZaakAssistent),
so one rule for every object list would move those away from their board. The card needs to say which it is.

## What changes

- `CnObjectListWidget` takes `content.tableBleed: true` and marks itself `cn-object-list-widget--bleed`.
- In the board look, a marked list in a detail card runs its table under the card's 22px side padding, without its own
  border, and pads its outer cells 22px.
- Without the flag nothing changes. The Nextcloud look is unchanged.

No schema change: a detail widget's `content` is not validated key by key.
