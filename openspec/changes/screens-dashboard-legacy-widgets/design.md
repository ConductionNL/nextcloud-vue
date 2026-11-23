# Design: screens-dashboard-legacy-widgets

## D1. Where the footer is dropped

CnDashboardPage passes `content` to a registry widget through
`registryWidgetBindings`. A new `collectionContent(content)` adds
`allowCreate: false` when the page is in the board look and
`showWidgetActions` is `false`, and the content has no `allowCreate` key of
its own. Widgets that do not read `allowCreate` ignore the key. The menu and
the footer are the same create entry in two places (ADR-062: the Actions
menu's Add calls the widget's `openCreate()`), so the one switch governs both.

## D2. No change to the registry

The registry order (consumer, catalog, built-in) is unchanged; the test mounts
the PtDashboard shape with `banner`, `table` and `stat` and asserts each mounts.
The portaliq lint needs `banner`, `table`, `stat` (and the other catalog
types) in `RENDERABLE_WIDGET_TYPES`: an app change, reported to the portaliq lane.
