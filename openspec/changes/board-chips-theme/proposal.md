# Proposal: board-chips-theme

## Why

The boards draw quick-filter and saved-view chips as 38px pills (radius 19, weight 600), the overflow chip the same
(DqTeamwachtrij, DqZaken). Under the nldesign theme, which sets every button's radius and weight with `!important`
through its button tokens, the live chips drew as 8px rounded boxes at 700, the active one a heavy block and the
overflow "…" a box.

## What changes

In the board look a quick-filter tab (overflow chip included) and a saved-view chip set the theme's button radius
token to 19px and its weight token to 600, so the theme's own rules draw the board's pill.
