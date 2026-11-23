---
kind: code
---

# Proposal: nc-dashboard-widgets

## Summary

ARCH-AUDIT MOVE item. dossiq ships six Nextcloud Dashboard widgets (open cases, overdue cases, my tasks, deadline alerts, task reminders, stalled cases) as six components and six entry scripts, each a headerless CnDataTable with a name, a trailing line and "View all". Every app with dashboard widgets repeats that. `registerNcDashboardWidgets` registers widgets from configuration, and `CnNcDashboardList` is the list they show.

## Scope

- New `src/components/CnNcDashboardList/` and `src/utils/registerNcDashboardWidgets.js`, exported.
- No schema change: the config lives in the app's widget entry script. A manifest key (`ncDashboardWidgets`) is a later step if apps want it in the manifest.
