# The row button and the menu stand 14px apart

## Why

The row button kept its own 8px end margin beside the menu's 14px, so live put 22px between Beoordelen and the menu where DqZaakDocumenten draws 14 (r31 verdict gapNext 14>22; probed on :8080: button margin 0 8px 0 0, menu margin-inline-start 14px).

## What changes

- `.cn-files-browser__row-button` has no end margin; the gap is the menu's 14px.
