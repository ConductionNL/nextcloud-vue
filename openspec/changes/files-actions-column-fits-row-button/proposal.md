# The actions column fits a row button

## Why

The files table lays out fixed, so each column takes its width from the head. The actions head is the row menu's 48px column; with a row button (Beoordelen, 106px) beside the menu the cell overflows and the button runs past the card (DqZaakDocumenten r31 live: a 58px column holding 106 + 14 + 34; the board draws the button and menu inside the card).

## What changes

- CnFilesBrowser measures the first row's actions cell (padding, children and their margins) while a row button stands in it, and sets that as the actions head's width. Without a row button nothing changes.
