---
kind: code
---

# Proposal: screens-page-controls

## Summary

PqMijnWerk's bar carries, next to the chips, a "Toon afgerond" switch and a "Sortering" select that the lists below
follow. The old pipelinq component had both. A dashboard page has neither, and a list cannot say it listens to one.

The workspace is already the page's shared state (screens-page-lenses). This change adds:

1. `workspace-filter` `style: "toggle"`: a switch writing `onValue` / `offValue` (true / false). The select already
   exists.
2. `workspace-filter` `layout: "bar"` with `controls`: chips, switch and select side by side in one row,
   `align: "end"` pushing a control right.
3. `pageControls` on a list widget (`record-list`, and the `object-table` source): `sort` maps the select's values to
   sorts; `toggle` names the filter keys the switch removes while it is on.

Opt-in: a list without `pageControls` ignores the workspace, as before. Manifest schema bump.

## Scope

CnWorkspaceFilterWidget, CnRecordListWidget, CnWidgetObjectTable, a small util; docs; unit tests; harness e2e.
