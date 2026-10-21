# pl4-work-queue

## Why

pipelinq's "My work" dashboard widget is a custom table over `GET /api/worklist/mine`, which answers one flat list
(`{ items, total }`) where each item names its own page (`routeName`: a lead or a ticket). CnWorkQueue reads only
server-declared groups, so the widget stayed custom.

## What changes

- CnWorkQueue `content.itemsPath` reads a flat list as one group without a heading; an item's `routeName` becomes its
  route.
- `totalPath` and `viewAll` draw a "View all ({count})" link while more items exist than are shown.
- `dueField`, `lateField`, `subField` and `kind` read the due text, the late flag, a sub line and the item's kind from
  the item's own fields.

## Fleet reuse

- pipelinq MyWorkWidget becomes `type: "work-queue"` config.
- decidiq action items, shillinq's open invoices: any endpoint that answers a flat list of mixed records.
