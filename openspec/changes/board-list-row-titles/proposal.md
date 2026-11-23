# Proposal: board-list-row-titles

## Why

The boards draw a list row in a card as a title at weight 500 with a 13px muted line under it, at row height 56.
COMPDIFF r20 measured live rows at weight 700 and height 68: on DqZaaktype and DqZaaktypeOverzicht "Versies" and on
DqSociaalDomein, all rendered by CnRecordListWidget's rows (12px padding, title 700, line height 1.5). CnAuditTrailCard
sets its action in a `strong`, which made DqHandhaving's "Historie" rows read 700.

## What changes

In the board look, outside a dashboard (which keeps its own record-list rules), a record list row has 10px of padding,
its title is weight 500 in the main ink, and the title and the 13px line under it use the font's normal line height.
An audit row's action is set at 500 and its time and actor at 13px. The Nextcloud look is unchanged.
