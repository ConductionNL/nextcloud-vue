# Proposal: board-stat-tile-inset

## Why

A board stat tile sat further from its card edge than the boards draw it, and stood taller:

- In a card-fit cell the tile kept the 2px transparent border a free-standing tile keeps for its hover ring, so the
  label sat 2px further in on every side (COMPDIFF r19: content inset 19 > 23 on DqTeamwachtrij, 17/19 > 23 on
  DqTermijnen and DqDoorlooptijd).
- Only a tile in the KPI row dropped the card-fit cell's 8px 14px padding. A tile placed in the dashboard grid
  (DqMijnWerk, DqMijnTeam) added it to its own 18px 20px (inset 23 > 37).
- The label and the caption took Nextcloud's 1.5 line height; the boards set them at the font's normal height.

## What changes

In the board look a stacked board stat tile in any dashboard card-fit cell gets no cell padding and no tile border
(the wrapper draws the hover border there already), and its label and caption are set at `line-height: normal`.
