# Board-look index page tabs read as tabs, not links

## Why

The board draws an index page's sibling lists (CnIndexPage page tabs, such as
Contracten, Leveranciers and Portaalaccount on DqContracten) as folder tabs in
14px main-text ink, with the active tab at weight 700. Live drew them at 15px,
with a 1.5 line height, in the link colour, with the active tab at 600. COMPDIFF
r24 recorded font 14>15, lineHeight 16.8>22.5, color ink>primary and
active.fontWeight 700>600. The link colour comes from the nldesign `a` rules,
which mark it `!important`.

## What changes

In the board look, `.cn-index-page__page-tab` takes 14px at a 1.2 line height
and `color: var(--color-main-text) !important`, and the active tab takes weight
700. thematiq's id-level link rule skips the board-look tab
(thematiq fix/link-color-skips-index-page-tab), as it does for the board card
title. The default look is unchanged.
