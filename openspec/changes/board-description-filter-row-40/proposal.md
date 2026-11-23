# Proposal: board-description-filter-row-40

## Why

COMPDIFF r32: a dashboard description that holds the page's filters was 50px (DqDoorlooptijd, DqProcesanalyse), because
NcSelect's own margin (6px above, 4px under) beat the description select's `margin: 0`, and the header ended right under
it. DqTermijnen's header was 90px. Every board draws that header 98px: a 40px filter row and 8px under it.

## What changes

In the board look only, the description select draws no margin, and a description with filters pads 8px under it.
