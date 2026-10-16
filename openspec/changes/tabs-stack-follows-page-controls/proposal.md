---
kind: code
---

# Proposal: tabs-stack-follows-page-controls

## Summary

Board ShDebiteurenbeheer, tab Herinneringsrondes: chips (Alles, Volgende stap
deze week, Aanmaning, Gepauzeerd) sit at the top of the tab and switch the
invoice list below them. A dashboard can already do this one level up. A
`workspace-filter` with `style: "chips"` writes a lens into the page
workspace, and a dashboard widget with a workspace `visibleWhen` shows by it
(screens-page-lenses). Inside a tab it does not work: CnTabsWidget evaluates
`visibleWhen` per tab and draws every widget of a stack (`widgetIds`).

This change lets a widget in a stack follow the page controls. On a dashboard,
a stacked widget whose `visibleWhen` is a workspace condition draws only while
it holds.

## Scope

- CnTabsWidget reads the page workspace (`cnWorkspaceContext`) and leaves a stacked widget out while its workspace `visibleWhen` does not hold. The condition may sit on the widget, its content or its props, as on the dashboard.
- Off a dashboard (no workspace) every widget draws, as today.
- Tab-level `visibleWhen`, `countFrom` and the single-widget tab are unchanged.

## Out of scope

- Other `visibleWhen` modes (object field, source, endpoint) on stacked widgets.
