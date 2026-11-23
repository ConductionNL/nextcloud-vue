# Proposal: board-macros-rows

## Why

COMPDIFF r21 measured DqZaakAssistent's "Macro's" rows at 65px with the name at weight 600, where the board draws a
card's list row: the name at 500 over a 13px line, 56px. CnMacrosWidget sets the name at 600, and both lines take
Nextcloud's 1.5 line height.

## What changes

In the board look a macros row's name is weight 500, and the name and the line under it use the font's normal line
height. The Nextcloud look is unchanged.
