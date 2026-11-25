# Proposal: chart-label-resolve-batched

## Summary

`CnChartWidget` reads the referenced objects behind an aggregate's `labelResolve` keys in one list request (`_ids=a,b,c`) instead of one GET per key.

## Why

Measured on the dossiq dashboard (25 Nov 2026, sandbox reference stack): the cases-by-status chart opened one `GET objects/dossiq/statusType/{uuid}` per status. Alone each read takes ~84 ms; with the rest of the page in flight they queued to ~1.5 s each. Fewer requests per page is the lever (ADR-124), and `useRefLabels` already reads labels this way.

## What changes

- `resolveAggregateRefs` sends the keys the shared store does not hold yet as one `_ids` list read (the store's `fetchCollectionForOptions`, or one axios GET when no store is active).
- Rows are matched back by their own id. A key the batch did not return (a deleted target, or a server that ignored `_ids`) still gets its own per-id read, so a label is never wrong and a dangling key still reads "Unknown".
- A single key keeps its per-id read, which shares the store's in-flight dedup.
