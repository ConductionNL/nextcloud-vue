# A files row button stands beside the row menu

## Why

CnFilesBrowser puts a host row button ("Beoordelen") and the row menu in one
cell. Both are block-level, so they stack: DqZaakDocumenten rows are 91 high
with the menu under the button, where the board draws them side by side in
61px rows.

## What changes

- The row button and the row menu in the actions cell are inline-flex, middle
  aligned, 14px apart (the board's gap). Rows without a button are unchanged.
