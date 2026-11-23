# Proposal: list-keeps-its-newest-query

## Why

An index list could show every row with no pager ("298 van 298") after a person left the board view for the table.
Two flaws in the object store let an older query win over the newer one:

1. `fetchCollection` stored whatever response arrived last. On a slow instance the board's 500-row fetch, or a live
   refetch issued before the switch, landed after the table's 20-row fetch and replaced it.
2. The live-updates plugin recorded a fetch's parameters only once that fetch completed. A live hint arriving while the
   table's 20-row fetch was still in flight refetched with the board's 500-row query; that fetch then completed last
   and recorded 500 again, so every later hint kept loading all rows.

Seen on dossiq's Cases page for a person who opened the workflow board (`?_view=board`) and switched to the table.

## What changes

- `fetchCollection` drops a response when a newer `fetchCollection` for the same type started after it, so the newest
  query decides rows, pagination, facets and errors. `append` pages (the board's "Load more") follow the same rule.
- The live-updates plugin records a fetch's parameters when it starts, and does not record `append` pages, so a live
  refetch repeats the newest query the list asked for.
