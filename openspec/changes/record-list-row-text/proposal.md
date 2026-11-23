# Proposal: record-list-row-text

## Why

DqDashboard draws Vastgelopen zaken, Zaken die u volgt and Recent geopend as rows of three lines: the case title, its
number, and a muted line saying how long it has been idle or when it was opened ("12 dagen stil", "vandaag"). There is
no chevron. A record list in `rows` draws two lines and always a chevron on a linked row, so dossiq drew these tiles as
tables instead, with underlined links and the date in a column.

## What changes

In `presentation: "rows"` CnRecordListWidget draws `content.text` (a template, already read for `feed`) as a muted line
under the meta line. `content.chevron: false` leaves the chevron off a linked row; the row stays a link. Without the keys
nothing changes.

## Scope

nextcloud-vue; dossiq uses it on its Dashboard tiles (R22-DASH). Manifest widget content is open, so no schema change.
