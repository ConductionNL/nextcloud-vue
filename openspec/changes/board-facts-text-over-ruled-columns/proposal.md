# Proposal: board-facts-text-over-ruled-columns

## Why

r36 (DQ-L7, nc-vue 2.163.0) measured DqSociaalDomein "De melding" 257 tall against the board's 263, so "Andere zaken van dit huishouden" and "Gezinsplan" stood 6 and 7.2 high. The board draws the card as a 14px column: the running text 14px under the title and the ruled three-column facts 14px under the text. Live started the text 12px under the title (the rule for running text over chips, DqZaak "Het verzoek", which the board draws at 12) and the facts 10px under it.

## What changes

Board-look CSS only, in `src/css/look-board-detail.css`: a facts widget whose running text is followed by ruled three-column facts starts 14px under the title and keeps 14px between the text and the facts. Running text over anything else keeps 12px. No schema change.
