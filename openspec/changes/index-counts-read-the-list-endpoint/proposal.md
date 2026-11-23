# Proposal: index-counts-read-the-list-endpoint

## Why

BOARD-SYNC (25 Oct, :8080 after REFRESH-3): the case list's "Alles" chip read 173 while the list's own total for the same
filters was 111. The chips were counted through OpenRegister's aggregation endpoints (`/aggregations/.../value`,
grouped counts), the list through the list endpoint; the two are separate queries and can disagree (access rules,
archived or deleted rows, filter spelling). A number beside a list that the list does not show is read as fact.

## What changes

`fetchFilterCounts` takes `via: 'list'`: every entry is counted with the list endpoint (`_limit=1`, its `total`), the
request the list itself sends. CnIndexPage counts its quick-filter tabs, saved views and filter-strip pills that way.
Other callers keep the aggregation endpoints. No schema change.
