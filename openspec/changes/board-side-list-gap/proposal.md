# Proposal: board-side-list-gap

## Why

r29 on :8080: the "Versies" side card (DqZaaktypeRegels, DqZaaktypeStatussen) started its list 2.2px higher than the
board (gapBelowTitle 21 vs 18.8). A side card's body starts `10px - first-line leading` under the title, a glyph-to-glyph
gap for text, but a list row opens on its hairline and has no leading to subtract.

## What changes

In the board look, a side card whose body opens on a record list starts it 10px under the title box.
