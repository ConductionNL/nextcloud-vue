# A secondary line can read the records a row points at

## Why

Board PqNieuwsbrieven draws a line under each newsletter: "Segment: verenigingen in Zuiddrecht · 412 contacten" for one sent to a segment, "Mailinglijst: Afvalnieuws · 2.180 abonnees" for one sent to a mailing list. A column's `secondary` template could only read the row, and the row holds only the segment's or list's id. A mailing list stores no subscriber count at all; it is the number of subscriptions that point at it.

## What changes

- A column may declare `secondaryRefs`: aliases for the records its row points at (`{ segment: { field: 'segmentId', register, schema } }`). CnDataTable reads each referenced record once, however many rows point at it, and the template reads it as `{segment.name}`.
- A reference may declare `counts`: per referenced record, an OpenRegister count aggregate whose `where` reads that record through `@self.<path>` (`{ subscribers: { register, schema: 'subscription', where: { listId: '@self.id' } } }`), read as `{list.subscribers}`.
- `secondary` may list templates; the first whose fields all hold a value is drawn, so one column reads a segment line or a list line.
- fillTemplate gains `|lowerfirst` (a name inside a sentence) and `|number` (grouped in the user's locale, "2.180").
- CnObjectListWidget passes `secondaryRefs` through.
