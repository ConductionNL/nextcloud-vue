---
kind: code
---

# Proposal: screens-stats-block-grid

## Summary

PqMijnWerk draws the user's week in one card, "Je week tot nu toe": answered, within the deadline, average answer
time and turned into a case, two by two. A `stat` widget can compute each of those (count, `ratio`, `elapsed`), but
it is one card per figure, and a `stats-block` holds several figures in one card only as plain counts (`entries`).

A stats-block with `layout: "grid"` takes `stats`: a list of stat tile contents (any source kind a `stat` takes),
drawn under the card's title in `columns` columns (default 2).

## Scope

CnStatsBlockWidget, CnDashboardPage (forwards `content.stats` and `content.columns`); docs; tests. The widget content
is free-form in the manifest schema, so no schema change.
