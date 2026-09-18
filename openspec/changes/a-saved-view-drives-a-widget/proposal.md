---
kind: code
depends_on: []
---

# Proposal: a-saved-view-drives-a-widget

Gap scan pack c, parity ledger row 10.10 "Widgets driven by a saved search".
Owner nextcloud-vue, because the widget catalogue and the saved-views client
both live here.

## Why

A handler saves a view because they come back to it. "Bezwaren without a
hearing date", "my district, still open". Then they open the dashboard and
build the same query again as a widget, or ask an administrator to, or give
up and keep the list open in a second tab.

Saved views and dashboard widgets are the same thing asked twice, and this
library owns both halves and has never joined them.

## What is actually there

Read against `parity/round2`.

The views exist. `useSavedViewsApi.js`, `CnSavedViewsControl` and
`savedViewPlaces.js` read `GET /apps/openregister/api/views` and list the
user's own views plus the public ones, scoped server side. `CnIndexPage`
renders the control whenever `allowSavedViews` is true, and dossiq turns it
on for two index pages already.

The widget catalogue has no way to name one. `dashboardWidgetRegistry.js`
carries `stat`, `delta`, `gauge`, `stats-block`, `chart`, `object-list`,
`table` and the rest, and every data widget is configured with a register, a
schema and a filter written by whoever edited the manifest.

`dashboard-layout-per-user` (#1209) got close and stopped short on purpose.
`userWidgetPresets()` reads `config.userWidgets[]`, which is the APP
pre-configuring a query under a name a user recognises. That is the right
answer for the two lists every handler wants. It is not a saved view: the
reader did not write it, and it does not change when they change theirs.

## What this change does

- **A `saved-view` widget type.** Its configuration is one view id and
  nothing else. The register, the schema, the filter, the order and the
  columns come from the view, because a widget that copies them is a copy
  that drifts the first time the reader edits the view.
- **It is `userAddable`.** This is the one data widget a user can finish
  configuring without a register and a schema in front of them, which is the
  reason `listUserAddableWidgetTypes()` excludes the others.
- **A view the reader cannot read renders a refusal, not an empty list.**
  A view that was deleted, or a public view that was made private, is not a
  list with no rows in it. An empty grid card and a view that went away look
  the same, and only one of them is somebody's problem.
- **The widget follows the view.** The reader edits the saved view on the
  index page and the widget shows the new answer on its next load. Nothing
  is copied into the layout record.

## What this change does not do

It does not let a user save a view from the dashboard. A view is made where
the reader can see what it selects, which is the list, and a filter built
against a card of ten rows is a filter nobody can check.

It does not carry the view's columns into `stat` or `chart`. A saved view
selects rows; turning rows into a number or a series is a second decision,
and folding it in here would make one widget type answer three questions.

## Impact

- `src/components/CnWidgetGrid/dashboardWidgetRegistry.js`
- A new `CnSavedViewWidget` and its config sub-form
- `src/composables/useSavedViewsApi.js`
- `src/schemas/app-manifest-v2.schema.json` and the compiled validator,
  regenerated through `scripts/build-validators.js` and never hand-edited
- Affected specs: `saved-views-ui`
- Size: M
