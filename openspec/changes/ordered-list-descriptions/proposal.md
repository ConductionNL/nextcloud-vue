# Proposal: ordered-list-descriptions

## Why

Board DqPersoonlijkeInstellingen shows each case type in "Zaaktypen in mijn menu" with an icon and a second line
("Woo-verzoek · 19 open zaken"). CnOrderedListField drew a label only.

## What changes

- A choice can carry `description` (a muted second line, in the row and in the picker) and `icon` (an MDI name in a
  small tile). The row's buttons name the description through `aria-describedby`.

Backwards compatible: a choice without them renders as before. No schema change.
