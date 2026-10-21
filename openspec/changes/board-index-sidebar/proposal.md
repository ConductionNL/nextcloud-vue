# Proposal: board-index-sidebar

## Why

The index sidebar (NcAppSidebar under CnIndexSidebar) did not draw the board's side panel (IndexZijpaneel,
DqFilterBeheren, COMPDIFF r20-partial): 389px wide instead of 360, the title 600 on a 30px line instead of 700 on 24px,
a square close button, and the tabs as Nextcloud draws them: icon over label, 54px high, 15px, a tinted ground and a
short 4px pill under the open one (20 flags on the tab strip alone). The board draws a row of icon-and-label tabs,
40px high, 14px, in the soft ink, the open one in the light primary ink over a 2px underline on the strip's hairline.

## What changes

In the board look, on a page with an index page, the sidebar is 360px wide, its title 700 on a 1.2 line, the line
under it 14px muted, its close button round, and its tabs the board's underline strip. Plain Nextcloud is unchanged.
