# Proposal: reports-catalogue-rhythm

## Why

COMPDIFF pl3 (28 Oct) measured board PqReports against live: the aside card titles at line height 25.5 where the board
draws 20.4, the category rows 38px high where the board draws 34, the category rows and the cards' Open link in the
link colour (54, 105, 165) where the board draws the main ink, and every card and section a few pixels lower (page
description, section titles and card categories at Nextcloud's 1.5 line height). The rows and Open set the main ink
already, but the NL Design theme forces every link into its link colour with `!important`.

## What changes

In the board look the reports catalogue sets its description, section titles, card categories, aside titles and
category rows at the font's normal line height, and the category rows and the cards' Open link hand the main ink to
`--nldesign-color-on-surface`, the variable the theme's link rule reads. The Nextcloud look is unchanged.
