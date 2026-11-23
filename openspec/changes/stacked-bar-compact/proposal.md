# A stacked bar can be the compact summary box

## Why

DqZaakDocumenten draws the review summary inside the files card as a compact
grey box: "4 van 7 beoordeeld" at 15px bold with "Nog 3 te gaan voor het
besluit" beside it, one 8px bar with joined segments, and the legend on one
line ("● Openbaar 2 ● Deels openbaar 1 ..."). CnStackedBarWidget draws the
dashboard version: a 12px bar of separate pills and a legend of big numbers
under their labels.

## What changes

CnStackedBarWidget `content.compact: true`: the box (sunken ground, radius
10, 14px 16px, 10px apart), a 15px heading, one 8px bar with joined segments,
and an inline legend (round 10px dot, the label in the main ink, the count
bold at the text size, 8px 18px apart). Without it nothing changes.
