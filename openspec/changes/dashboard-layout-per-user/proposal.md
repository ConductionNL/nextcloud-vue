---
kind: code
---

# Proposal: dashboard-layout-per-user

## Summary

Let a user rearrange, add and remove widgets on a manifest dashboard and keep
that layout for themselves. `CnDashboardPage` already edits a layout and emits
it; this change persists the result per user, on top of the manifest layout
the admin ships. A user picks from the registered widget catalog, including a
saved-view list and a task list.

Opened from the dossiq competitor analysis, round 2, Tier B row B08
(`concurrentie-analyse/procest/_round2/compare/tier-b-and-sibling.md`).
Decision D10 (Ruben, 2026-09-08): proposal now, implementation separate.

## Motivation

dossiq's Dashboard layout is manifest-fixed. "Edit with Buildiq" is an admin
tool that changes the page for everyone
(`_round2/dossiq-baseline/dashboard-anatomy.md`). All three competitors let
the user own their landing page:

- xxllnc Zaaksysteem: a react-grid per user with "Widget toevoegen" offering
  saved_search, tasks, favorite_case_type and external_url
  (`xxllnc-zaken/round2/pages/DashboardV2.md`).
- Valtimo GZAC: a data source plus display type per widget, role-scoped
  (`valtimo/round2/pages/Admin-Dashboard.md`).
- OpenCase: Nextcloud dashboard widgets with Customize
  (`opencase/round2/pages/NextcloudDashboardWidgets.md`).

## Affected projects

- `nextcloud-vue`: `CnDashboardPage`, `useDashboardView`, a `dashboardLayouts`
  store plugin, and the `dashboard-page` capability.
- Consumers: dossiq (Dashboard, My work), launchpad, pipelinq, keepiq. Every
  manifest `type: dashboard` page can opt in with one config key.
- buildiq keeps the admin path: it edits the manifest layout, which stays the
  default for users without a saved layout.

## Backward compatibility

Off by default. `config.userLayout: true` on a dashboard page enables it. A
page without the key renders and edits exactly as today. The user layout is
stored under the user's app config, keyed by page id, and never changes the
manifest.

## Theming

No new colours. The widget picker reuses `NcModal` with the existing
`CnWidgetPicker` list styling.
