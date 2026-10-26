# Proposal: saved-view-counts-read-the-query

## Why

With `viewCounts` on (dossiq Cases, b34), every saved view in the side panel showed the same count, the whole list
(298 on :8080, 23 Oct; DqFilterBeheren draws 3, 4 and 15). `viewAsTab` read a view's `filters`/`filter`, but an
OpenRegister view and a default view keep their conditions in `query.filters` and `query.overrides.lockedFilters`, so
each count went out with no filter.

## What changes

`viewAsTab` falls back to the query: the locked filters, then the filters. Lenses and counts both read it.
