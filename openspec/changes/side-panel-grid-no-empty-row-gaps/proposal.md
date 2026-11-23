# Proposal: side-panel-grid-no-empty-row-gaps

## Why

DqZoekresultaten on :8080 (24 Oct, r25b): 60px of empty space between the page header and the tabs. The side-panel index
page is a grid of seven rows and the board look gives it a 20px row gap; the gap opens between empty rows too, so the
missing below-header, stat row and chip row added three gaps. Probe: toolbar at y 245; with the fix 185 (board 188).

## What changes

In the board look the side-panel grid has no row gap; the header, below-header, stat row and toolbar carry the section
gap as a bottom margin, the chip row its own 12px on top of it.
