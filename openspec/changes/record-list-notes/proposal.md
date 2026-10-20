# Proposal: record-list-notes

## Why

dossiq's "Dag afsluiten" (DqDagAfsluiten) is a custom view. Ruben decided it moves onto manifest config over library
widgets, losing nothing, with the day lists worked out on the server. Its core is a list where each row the reader
opened today gets a field for what happened, recorded as a note on that case or task, with humaniq's hours beside it, a
"ready to record" count of what is typed and not yet recorded, and one button that records them all. No library widget
did that, rows could not open different pages, an empty list could not say which of two reasons it is empty, and a
dashboard header could not name today's date in its crumb.

## What changes

- CnRecordListWidget `presentation: "notes"` with `noteAction: { urlField | url, bodyField?, label, fieldLabel,
  placeholder?, readyLabel, draftsKey, errorText?, recordAll?: { label, title?, text?, icon?, cancel?: { label, route } } }`
  and `rowLeaf: { id, app?, register?, objectIdField, schemaField? | schema?, unavailableText? }` (new CnRecordNoteRows):
  a field per row, an optional integration leaf, a record button posting `{ message }` to the row's notes URL; drafts kept
  in session storage and counted as the ready figure; a record-all footer; after a note is recorded the page's
  endpoint widgets refetch. A failed note is kept and the list says so.
- `rowRouteField`: the route name read from the row.
- `emptyTexts: [{ when, text }]`: the first whose visibleWhen condition holds replaces `emptyText`.
- CnDashboardPage `headerMeta` fills `{today}` with today's date written out.
