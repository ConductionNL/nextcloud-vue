---
kind: code
---

# Proposal: screens-enum-rank-sort

## Summary

The Mijn werk page (pipelinq) lost its "priority first" sort: `priority` is a text field (urgent, high,
normal, low) and OpenRegister's list endpoint orders a column by its value only, so `_order[priority]`
answers high, low, normal, urgent. OpenRegister has no order by a mapped rank (`_order` takes a field and
a direction; checked in `MagicMapper::buildUnionOrderKeys` and `MagicSearchHandler::applyResultOrder`).

A record list shows the first N rows of a query, so it can be exact without a server change: it reads the
rows one rank value at a time, best first, until its limit is full.

## What changes

1. A sort (the list's own `sort` or an entry of `pageControls.sort.map`) may carry
   `rank: ["urgent", "high", "normal", "low"]` and `then: { field, dir }`.
2. The record list then reads one request per rank value (filter `field=value`, ordered by `then`), stops
   when `limit` rows are in, and fills what is left with the rows whose value is outside the rank or empty.
   The total comes from one unfiltered count request.
3. The object table ignores a sort entry with `rank` and keeps its own order: it pages, and a rank order
   over pages needs the server.

## Limits

- At most `rank.length + 2` requests per fetch instead of one.
- Record list only. A paginated list (the object table, an index page) is not served: sorting the fetched
  page client-side would order page 1 only and read as a sorted list. That needs OpenRegister to order by
  a rank, for example `_order[priority]=asc` with `_orderRank[priority]=urgent,high,normal,low` compiled
  to a `CASE` expression with bound values, or the rank declared on the schema property.
- A list whose own filter already fixes the field ignores the rank.

No schema change (widget content is an open object).
