---
kind: code
---

# Proposal: stat-caption-days-since-earliest

## Summary

DqMijnWerk's "Wacht op inwoner" tile draws "langste: 9 dagen" under its count: how long the case that waits
longest has waited. A stat caption could count records, sum or average a number, or show a share, but not
say how long ago the earliest of a set of dates was. The case's `currentStatusDwellDays` does not help: it is
written only at a status change, so it reads 0 for a case that is still waiting.

## What changes

1. `captionSource.metric: "daysSinceEarliest"` with a date `field`: `{count}` is the whole days from the
   earliest `field` date among the records the caption's filter matches to today.
2. It is one list read (`_order[field]=asc`, `field[isnull]=false`, `_limit=1`), because the aggregation
   endpoint takes min and max of numbers only.
3. No matching record, or one dated today, counts 0: the caption then reads `zeroText` or is left out, as any
   caption count at zero does. An unreadable date leaves the caption out.

A `captionSource` with another metric reads as before.
