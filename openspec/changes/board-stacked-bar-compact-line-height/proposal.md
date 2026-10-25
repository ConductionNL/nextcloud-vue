# The compact summary runs on the normal line height

## Why

DqZaakDocumenten draws the review summary box ("4 van 7 beoordeeld", the bar, the legend) on the normal line height: 91px high. Live inherits 1.5: heading 22.5, legend 21, box 99.5 (r29; read on :8080).

## What changes

- Board look: `.cn-stacked-bar--compact` has `line-height: normal`.
