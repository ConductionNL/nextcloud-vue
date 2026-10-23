# Proposal: board-index-page-tabs

## Why

COMPDIFF r24 on DqContracten: the index page's sibling-page tabs ("Contracten", "Leveranciers", "Portaalaccounts")
are links, and under thematiq they took the link ink and underline at 15px on 1.5, the open tab at 600, with a line under
the strip. The board draws them as folder tabs in the main ink at 14px, the open one at 700 on a white bottom edge,
without a line under the strip.

## What changes

In the board look CnIndexPage's page tabs take the main ink (also through the theme's link tokens), no underline, 14px
at the normal line height; the open tab is 700 with a white bottom edge; the strip draws no line of its own. The
Nextcloud look is unchanged.
