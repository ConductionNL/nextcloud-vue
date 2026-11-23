# Proposal: board-card-table-gap

## Why

DqZaaktypeStatussen draws the Statussen and Resultaten tables 12px below the card's title block. Live put them 10px
below: a board card's body starts `12px - first-line leading` under the title, a glyph-to-glyph gap for text, but a table
head is a filled box without leading. compdiff: gapBelowTitle 41 board vs 38.8 live.

## What changes

In the board look, a detail card whose body opens on an object list starts it 12px under the title box. Checked on
:8080 with the rule injected: header bottom 323, table top 335.
