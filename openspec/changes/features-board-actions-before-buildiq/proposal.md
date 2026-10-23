# Proposal: features-board-actions-before-buildiq

## Why

DqFunctionaliteiten draws its header as Documentatie, Acties, then the buildiq square; the features board drew the
buildiq square before the Actions menu. Every other board header with an Actions menu (DcVergaderingen, DcBesluiten,
DqZaaktypen) also puts Acties before buildiq, and the primary button last.

## What changes

`CnFeaturesBoard` draws its header buttons as Documentation, Actions (without tabs), buildiq, Suggest feature.

## Reach

Every roadmap page in the board look. No prop or schema change.
