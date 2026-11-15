# Proposal: board-head-menu-keeps-head-row

## Why

COMPDIFF pl6 measured PqTaken's table head row 58.5px where the board draws 49.5. The page sets `filterMenu` beside its
side panel, so CnIndexPage puts the filter menu in the row-actions column's head, and that menu's 34px button set the
row's height. The Dq index tables have no menu there and keep 47.5 to 49.5 (DqTaken, DqZaken); the board draws its
filters as 22px funnels in the column heads.

## What changes

In the board look a menu in the row-actions head (`filterMenu`, `columnMenu`) takes the 22px head control size of the
column funnels. The menus stay; the Nextcloud look is unchanged.
