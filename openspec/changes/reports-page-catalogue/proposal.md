# Proposal: reports-page-catalogue

## Why

COMPDIFF pl2, pipelinq PqReports (17 items): the board draws "Rapportages" as a catalogue: an h1 header with the buildiq
square and "Nieuw analyserapport", the categories as chips with counts ("Alle categorieën 8"), the reports in sections in
a main column, each card with its icon tile, title, category, description and a footer line with an Open button, and an
aside with the category index and "Mis je een rapportage?". The board look of `CnReportsPage` (made for DcRapportages)
draws the title as an h2, one section per category and cards as links, with no chips and no aside.

## What changes

- In the board look the reports page title is the page's h1 (all board reports pages).
- `config.catalogue: true` (board look only) draws the catalogue: chips that narrow the sections, catalogue cards with
  their category and a footer (`cardMeta`, a card's own `meta`) with an Open link, and an aside with the category index
  and `config.asideNote` (`{ title, text }`). Without it the board look is unchanged.
