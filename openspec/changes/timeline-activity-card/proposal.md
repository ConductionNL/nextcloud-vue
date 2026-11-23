## Why

The client boards PqKlant and PqOrganisatie draw an "Activiteit" card: a title with two header buttons (link an email, compose in Mail), pill chips per kind, a box for an internal note, and a feed of rows with a round icon, a meta line ("2 okt, 09:30 · contactmoment · Fatma Yildiz") and the text. pipelinq drew this with its own ActivityTimeline. The library's timeline widget already reads pipelinq's `/api/timeline` with type chips, but its read view has no note box, draws chips as buttons and events as a dotted rail.

## What changes

- The read view takes `layout: 'feed'` (icon tile, meta line, text) and `composer` (a note box that writes an OpenRegister note on the record and reads the timeline again).
- Type chips are pills, as the manage view's kind chips.
- The read view reads again on `cn:timeline:changed` for its record.
- A widget's header actions dispatch with the record as token context, so a `navigate` target fills `@object.<field>` inside the URL.
- New `CnEmailLinkDialog`: the Mail picker plus the link to the record, for a header action to open.

## Impact

No schema change (timeline content and widget header actions are free-form). Stacked on fix/pq-loyaliteit-dashboard c229620f0 (tonal header pill, token context for dashboards). First consumer: pipelinq ClientDetail.
