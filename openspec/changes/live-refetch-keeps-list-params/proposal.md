# Proposal: live-refetch-keeps-list-params

## Why

The live-updates plugin refetches a collection on a push or poll hint with the parameters of the last
`fetchCollection` call, which a `$onAction` observer records. Pinia ties an observer that is not detached to the
effect scope it is created in, and the plugin's setup runs inside whichever component first calls `useObjectStore()`.
When that component unmounted, the observer went with it, the stash stayed empty, and the next hint refetched the list
with no parameters: no page size, no filters. On dossiq's cases index the table grew from 20 rows to all 297 a few
seconds after load, the pager still said page 1 of 15 and sat 19,000px down (COMPDIFF r19: table rect.h 19310 on
DqZaken, the pager not found on DqZaken, DqWooVerzoeken, DqPersoonlijkeInstellingen). The logs plugin's auto-refresh
observer had the same flaw.

## What changes

Both plugins register their observer detached (`$onAction(callback, true)`), so it lives as long as the store.
