---
kind: code
---

# Proposal: screens-dashboard-legacy-widgets

## Summary

The portaliq lane reported two dashboard gaps on PtDashboard (round6
portaliq library gaps 2 and 3):

1. On a `config.widgets` dashboard CnDashboardPage would mount only tile,
   chart and stats-block plus the app's own widgets, so the "Vandaag eerst"
   attention card (`banner`) and the list cards (`table`) could not be used.
2. `config.showWidgetActions: false` would not remove the per-widget
   "Acties" menu and the "Toevoegen" footer there.

Measured on development (unit mount of the PtDashboard shape): the first is
not a library gap. CnDashboardPage resolves `banner`, `table` and `stat` on
a `config.widgets` dashboard through the widget registry (consumer registry,
then the dashboard catalog, then the built-in widgets); the "tile, chart,
stats-block" list is portaliq's own renderer-contract lint
(`tests/validate-manifest.js`, `RENDERABLE_WIDGET_TYPES`), which predates the
registry unification. This change pins the behaviour with a test.

The menu half of the second is also already true: `showWidgetActions: false`
reaches every widget wrapper. The "Toevoegen" footer is not the menu: it is
the list widget's own create affordance (`content.allowCreate`, on by
default). The boards draw no Add footer on a dashboard list card
(PtDashboard, DqMijnTeam). This change adds that, behind the board look:
a dashboard with `showWidgetActions: false` also drops the Add footer of
its list widgets, unless a widget sets `content.allowCreate` itself.

## Reference screens

- `portaliq/PtDashboard`: https://identity.conduction.nl/screens/board?id=portaliq/PtDashboard
- `dossiq/DqMijnTeam` (list cards with a header link, no footer)

## Affected consumers

Board-look apps that set `config.showWidgetActions: false` (portaliq).
Without the board look nothing changes.

## Backward compatibility

Additive and opt-in; no manifest schema change.
