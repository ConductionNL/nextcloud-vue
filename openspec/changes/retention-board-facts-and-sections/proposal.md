# The archiving card's facts and section titles as the board draws them

## Why

COMPDIFF r25b DqZaakArchivering (24 Oct): the facts' labels sat right-aligned and indented over their values (first row inset 74 vs 23, gap below title 68 vs 30): Nextcloud's server.css draws every `dt` as a 130px right-aligned inline block and pads `dt`/`dd` 12px. "Bewaren voor een procedure" and "Overdracht naar het e-Depot" were 24px headings; the board sets them 15px/600.

## What changes

- CnRetentionWidget: its facts' `dt`/`dd` are block, auto width, start-aligned, without padding or margin.
- Board look: the retention card's section titles 15px/600.

## Impact

CnRetentionWidget and look-board-detail.css. No schema change.
