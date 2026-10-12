---
kind: code
---

# Proposal: screens-page-lenses

## Summary

Ruben, 12 Oct 2026: pipelinq's "Mijn werk" stays a dashboard manifest page, and the library must do everything the old
component did first. PqMijnWerk opens with a strip of chips (Alle 9, Tickets 7, Leads 1, Opvolgingen 1) that shows one
kind of work at a time. A dashboard page has no such control.

The library already has the two halves: the `workspace-filter` widget writes a choice into the page workspace, and a
widget can be hidden by `visibleWhen`. They do not meet: `workspace-filter` has no chip style, counts only from a
grouped facet, and keeps no state in the address; `visibleWhen` cannot read the workspace.

This change closes both gaps, in the existing mechanism:

1. `workspace-filter` `style: "chips"`: one compact segmented group (the board's 3px track, 34px segments), a count
   after each label from a static `count` or from `countFrom` (one list, or several that are added up).
2. `urlKey`: the choice lives in the address (`?lens=tickets`) and wins over `default` on load.
3. `visibleWhen` WORKSPACE mode `{ workspace: "<key>", op, value }`, plus the operator `in`: a dashboard widget or
   KPI-row tile appears and disappears with the key, and the grid closes the gap.

## Scope

CnWorkspaceFilterWidget, visibleWhen, CnDashboardPage; docs; unit tests; harness e2e. Manifest schema 2.87.0.
Opt-in: a widget without the keys renders as before.
