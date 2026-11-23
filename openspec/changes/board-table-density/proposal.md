# Proposal: board-table-density

## Why

The dossiq boards draw two table rhythms. An index page's list pads every cell 16px at the sides (DqZaken, DqTaken,
DqOrganisaties, DqZaaktypen, DqZoekresultaten). A table inside a card is compact: 10px 12px in the header, 11px 12px in
the cells (DqInstellingen, DqVthInstellingen, DqZaaktype, DqTermijnen, DqTenant). The board look drew the index list
with 12px data cells (a rule taken from PqTickets) and every other table with the index list's 12px 16px and 14px 16px
(COMPDIFF r19b: table head.paddingLeft 16 > 12 on 9 boards, 12 > 16 on 4). The 12px rule also outranked the title
column's 18px, so PqTickets' title sat 12px in.

## What changes

- An index page's main table pads its data cells 16px at the sides, as its selection and menu columns.
- The plain-title table (`rowTitle: "plain"`, PqTickets and OcPublicaties) keeps 12px data cells and starts its title
  column 18px in; the 12px rule leaves the title column out, so the 18px holds.
- Any other board table (a settings card, a detail card, a dashboard widget) pads its header 10px 12px and its cells
  11px 12px; its selection column keeps 16px.
