# board-open-manage-toggle-clear

## Why
r34 DqFilterBeheren and DqFilterInMenu: with a saved view's manage menu open, its trigger read rgb(240, 241, 243), NcActions' open background, over the row's primary tint. The boards draw the trigger clear on the tinted row, rgb(234, 240, 247).

## What changes
- In the board look, an open saved view manage trigger has no background of its own. The Nextcloud look is unchanged.
