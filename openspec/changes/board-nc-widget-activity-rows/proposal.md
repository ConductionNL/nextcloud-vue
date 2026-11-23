# Proposal: board-nc-widget-activity-rows

## Why

COMPDIFF r24 measured DqMijnWerk's "Recente activiteit" card, a Nextcloud dashboard widget shown through
CnNcWidgetWidget. The board draws each activity as a list row: a 10px dot, the text in the main ink at 14px over a 13px
muted time, rows 12px tall above and below their text with a hairline between them. Live drew the Nextcloud item: a
32px icon, a bold one-line link-coloured title, the first text 65px in instead of 25px, and 16px under the title
instead of 26px.

## What changes

In the board look, a vertical CnNcWidgetWidget on a dashboard card draws its items as the board's activity rows. The
item's icon images are not shown; the icon slot is the 10px dot in the primary colour. The horizontal mode and the
Nextcloud look are unchanged.
