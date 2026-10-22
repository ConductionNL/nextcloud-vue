# Proposal: timeline-all-chip-host-label

## Why

DqZaakHistorie draws the timeline's first filter chip as "Alles", the word dossiq uses on its own filter chips. The
library chip read only the library catalog, which translates "All" as "Alle" (COMPDIFF r22: chip "Alles" missing,
"Alle" extra on the case history).

## What changes

CnTimelineManage asks the host's translate for "All" first and falls back to the library catalog when the host has no
translation of its own.

## Scope

nextcloud-vue, CnTimelineManage. The library's own catalog is unchanged.
