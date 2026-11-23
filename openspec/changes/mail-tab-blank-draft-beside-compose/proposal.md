# Proposal: mail-tab-blank-draft-beside-compose

## Why

DqZaakEmail draws "Mail opstellen" in the card header and, in the template row, both "Concept openen uit sjabloon" and
"Leeg concept", the row 16px from the template field. CnMailTab drops the row's empty-draft button whenever the header
carries `compose` (COMPDIFF r25: toolbar 2 controls vs 3, gap 8 vs 16).

## What changes

- `draft.blankButton: true` keeps the row's "Empty draft" button beside a `compose` header action. Without it the
  row drops the button as before.
- In the board look the template row stands 14px 16px apart.
