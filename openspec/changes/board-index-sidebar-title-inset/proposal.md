# Proposal: board-index-sidebar-title-inset

## Why

The board's index side panel sets its title 20px in from the panel's edge and 20px from its top (DqZakenSorteren,
DqFilterBeheren). Live drew the title against the panel's edge (COMPDIFF r21: title inset 1 against 21, top 13 against
20). With the schema icon hidden the header still carries NcAppSidebar's compact-with-figure classes, whose rule pads
the title 0 at the start, and the default 8px on top.

## What changes

In the board look the index side panel's header pads its title 20px at the start and 15px on top (the title's line box
adds the rest). The selector repeats NcAppSidebar's chain with doubled classes to outrank it.

## Scope

Board-only, `look-board-index.css`.
