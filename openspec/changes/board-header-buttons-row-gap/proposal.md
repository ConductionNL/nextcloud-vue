# Proposal: board-header-buttons-row-gap

## Why

r29 (25 Oct): with the side panel open, DqZakenSorteren's count line stood 67px under the title on :8080, 58 on the board (subtitle.gapBelowTitle 58.6 vs 67.6). With no breadcrumb trail the trail's grid row stayed empty and added a second row gap, and the buttons kept 3px below them.

## What changes

In the board look, with the side panel open, the header buttons keep 6px above and none below, and without a trail the count line takes the trail's row. Probed live by injection: title 96-130, buttons 142-182, count line at 188 (gap 58). No schema change.
