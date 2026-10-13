---
kind: code
---

# Proposal: screens-operator-key-lens-counts

## Summary

A quick-filter lens on a date range has to spell its operator in the key (`{ "scheduledDate[gte]": "@today" }`),
because the list request JSON-encodes a nested `{ gte }` object. Its count went to the aggregation endpoint, which
takes the key as a field name and answers 0. On decidiq's meetings page (board DcVergaderingen) "Komende" read 0
while the list under it showed five meetings.

A filter with an operator in a key is now counted through the list endpoint, the same way a list of values and a
null test already are (#1531).

## Scope

- `src/utils/fetchFilterCounts.js`: `hasOperatorKey`, used by `needsListEndpoint` and `singleEqualityOf`.
- Every count that uses `needsListEndpoint` gains it: index-page quick filters and saved views, and the stat widget.
- No manifest key, no schema change.
