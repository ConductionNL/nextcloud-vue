# Proposal: list-waits-for-its-schema

## Why

Since 1 November the case list's side panel (DqZaken, DqZakenSorteren) drew its reference filters as empty selects and its enums without counts. OpenRegister still answers `_facets=extend` with buckets, but the page's list request no longer asked for them: the object store adds `_facets=extend` only when it already holds the schema with facetable properties, and on a slow schema endpoint (8 s on :8080) a refresh started by a watcher (the default filters being applied) reached the store before the mount's `fetchSchema()` had settled. Measured on :8080: schema request 29.8 s to 37.6 s, list request at 34.5 s, sent without `_facets`.

## What changes

`useListView`: while the mount's schema request is in flight, a `refresh()` waits for it before fetching. Once the schema has settled, refresh behaves as before (no extra tick). No schema change.
