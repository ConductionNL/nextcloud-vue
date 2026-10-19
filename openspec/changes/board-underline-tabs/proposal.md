# Proposal: board-underline-tabs

## Why

The admin settings boards (DqInstellingen, DqBeheerinstellingen, DqInstellingenAlgemeen) draw underline tabs 4px apart
at weight 500, the open one at 700 over a 3px primary underline (COMPDIFF F043 on 9 boards). Live the tabs were 7px
apart and 3px low, because Nextcloud's core stylesheet gives every plain button a 3px margin, and every tab drew at
700 over a 1px underline, because the nldesign theme sets a button's weight and border width with `!important`
through its button tokens.

COMPDIFF F025 (a rule under the strip, present on the board, absent live) does not hold on this page: the rule is on
`.cn-tabs__bar`, 1px `--color-border`, where the measurement looked at the tab list inside it.

## What changes

The underline tab drops its margin and sets the theme's button tokens to its own weight (500, 700 when open), corner
(0) and border width (0 0 3px).
