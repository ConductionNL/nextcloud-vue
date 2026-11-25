---
kind: code
---

# Proposal: remote-conditions-read-once-per-record

## Summary

A header action bar (`CnActionButtons`) evaluates every action's `visibleWhen`
and `disabledWhen` again whenever the page's object context changes. A detail
page replaces that context when the record loads, when its visibility rows
arrive and when a lock is taken for an edit, so each endpoint or source a
condition names was asked again each time: a dossiq case read
`/api/case/{id}/lifecycle` three times (0.55 s each) while its Edit dialog
opened (PERF-HANDOFF, measured 24 Nov 2026).

The bar now keeps one map of remote reads per record. A condition's url is
asked once for that record; the record's lock and the page's visibility rows
do not count as a change. A change of the record itself, of the action list,
or a click on any action (which may change what an endpoint answers without
changing the record) starts a new map. A refused read is not remembered.

`evaluateVisibleWhen()` takes the map as an optional `ctx.remoteReads`; a
caller that passes none fetches on every call, as before.
