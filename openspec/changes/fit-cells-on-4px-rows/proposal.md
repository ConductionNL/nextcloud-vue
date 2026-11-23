# Proposal: fit-cells-on-4px-rows

## Why

COMPDIFF r32, DqDashboard: a size-to-content cell rounds up to a whole GridStack row, and on 10px rows the chart cards
("Zaken per status", "Zaken per type", 247.6px of content) took 280px, against a 271px pitch on the board, so the row
under them sat 9px low. A 10px row can leave up to 9.9px under any fit cell, more than compdiff's 4px.

## What changes

A grid with size-to-content cells splits each layout row into 20 rows instead of 8: with the default 80px cell height
that is 4px rows, so a fit cell ends within 4px of its content. Fixed cells keep their pixel size and place; edit mode
and the reported layout stay in layout rows.
