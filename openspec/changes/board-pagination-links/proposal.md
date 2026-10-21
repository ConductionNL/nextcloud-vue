# Proposal: board-pagination-links

## Why

The boards size a page link's content box at 34px, so a bordered link and "Volgende" draw 36px and the borderless
current page 34px. The board-look pagination draws every link as a 34px border box. COMPDIFF r19b: "Volgende" 34
against 36 on 10 index boards (DqZaken, DqContacten, DqContracten, DqOrganisaties, DqTaken, DqTeamwachtrij,
DqZaaktypen, DqZoekresultaten, DqFilterBeheren, DqZakenSorteren).

## What changes

In the board look a page link is 36px (min-width and height); the current page is 34px without a border, on the
primary fill.

## Scope

Board-only: the Nextcloud look's pagination is a different variant and is unchanged.
