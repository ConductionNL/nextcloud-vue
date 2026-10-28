# Proposal: aggregate-metadata-filter-keys

## Why

A filter on a metadata field, written as the list endpoint takes it (`@self[updated][lt]`), reached the aggregation
endpoint as `filter[@self[updated]][lt]`, which it reads as an unknown operator "updated" and refuses. A stat or a count
over "not changed in 14 days" (pipelinq's Verouderd lens, board PqLeads) answered nothing.

## What changes

`aggFilterParam` and `flattenAggFilter` name `@self[x]` / `@self.x` as the endpoint's `_x` column.
