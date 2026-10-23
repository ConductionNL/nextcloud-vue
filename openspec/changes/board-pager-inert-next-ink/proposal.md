# Proposal: board-pager-inert-next-ink

## Why

Every board draws "Volgende" in the main text colour, also on a single page where it is inert (DqContacten,
DqContracten, DqOrganisaties, DqZoekresultaten). The board look drew the inert Next in the secondary text colour.

## What changes

The inert Next keeps the page links' main text colour; it stays `aria-disabled` with a default cursor.

## Reach

Board-look pagers on a single page. No props, no schema change.
