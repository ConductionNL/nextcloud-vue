# Proposal: record-list-checklist

## Why

DqTenant's Inrichten card draws the set-up steps as a checklist in three columns, a done step ticked and an open one an
empty circle, under a bar of how far the set-up is, with "5 van 7 stappen klaar" in the header. A record list draws rows,
cards, a feed, a table or notes, not a checklist.

## What changes

CnRecordListWidget takes `presentation: "checklist"`: the rows in `columns` (default 3), each ticked when `done` (a
condition over the row) holds, with "Done" / "Not done yet" for a screen reader; `progress: true` adds a bar of the done
share. The existing `headerNote` `{count:<field>=<value>}` token counts the done rows.

## Scope

nextcloud-vue only. Widget content is not validated per key: no schema change. dossiq uses it on the organisation page.
