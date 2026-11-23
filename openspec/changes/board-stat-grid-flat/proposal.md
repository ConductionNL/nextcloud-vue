# Proposal: board-stat-grid-flat

## Why

COMPDIFF r24 on DqDagAfsluiten "Uw dag": the board draws the stat grid as plain figures at the card's inset, 14px under
the title, 16px apart: a 13px muted label, the figure at 24px/700 and a 13px caption, 2px apart. Live drew every cell
as a padded tile (18px 20px), so the first label stood 30px under the title and 22px further in.

## What changes

In the board look a CnStatGridWidget on a dashboard card sits at the card's inset, 4px under the header (14px under the
title), cells 16px apart, and its cells are flat: no padding or edge, the label 13px, the figure 24px, 2px apart. The
Nextcloud look is unchanged.
