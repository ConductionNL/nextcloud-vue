# Proposal: device-frames-read-title-and-sync-time

## Why

Board DqInspectie titles the middle phone frame by the inspection underway ("Kerkplein 7") and says when the device last synchronised ("Offline · gesynchroniseerd om 07:42"). The widget only took fixed text, so dossiq's manifest wrote "Checklist" and "Offline · synchronised earlier": the frame could not say which address the inspector stands at, nor how old the data on the device is.

## What changes

- A frame's `titleFrom: { source: { register, schema, filter, sort? }, field }` titles it by that field of the first matching record, read under the reader's rights. Without a match the configured `title` stays.
- The status's `syncedFrom: { source, field }` reads the newest value of a date field as the last synchronisation. While offline, `offlineSyncedText` with `{time}` replaces `offlineText` once a time is known.
- No manifest schema change; existing fixed titles and texts keep working.
