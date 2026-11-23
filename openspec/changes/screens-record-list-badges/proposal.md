---
kind: code
---

# Proposal: screens-record-list-badges

## Summary

A record-list row had one status pill. The Mijn werk page (pipelinq) needs two more
by config: the priority badge (coloured, shown only for non-default values) and an
age badge ("stale") when a date field is older than N days.

## What changes

1. `content.badges[]` on the record list: a field badge `{ field, labels?, colorMap?,
   variant?, hideValues? }` and an age badge `{ kind: "stale", field, afterDays, label?, variant? }`,
   drawn after the pill in the row's trailing area.
2. `content.pill.hideValues` hides the pill for the listed values.

No schema change (widget content is an open object). Without the keys nothing changes.
