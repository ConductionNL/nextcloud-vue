# Proposal: ordered-list-field

## Why

Board DqPersoonlijkeInstellingen has "Zaaktypen in mijn menu" in the personal settings: a list the user orders,
with a remove button per row and "Zaaktype toevoegen" as a search-as-you-type picker. The library had no control for
an ordered, user-kept list, and dragging alone would leave keyboard and screen-reader users out.

## What changes

- New CnOrderedListField: rows with move up, move down and remove buttons, a live-region announcement per change, and
  an NcSelect picker with an `inputLabel` that adds a row. The app supplies the choices and gets `update:modelValue`
  (and `search` with `searchable`).

Standalone component, exported. No schema change.
