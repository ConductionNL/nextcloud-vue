# dashboard-page Delta: screens-dashboard-legacy-widgets

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-dashboard-legacy-widgets](../../)

## Purpose

Pin that a `config.widgets` dashboard mounts the library's catalog widgets
and honours `showWidgetActions`, and let a board dashboard without widget
actions drop the Add footer of its list widgets.

## ADDED Requirements

### Requirement: A config.widgets dashboard mounts catalog widgets

CnDashboardPage SHALL mount a `config.widgets` widget whose `type` is a
dashboard catalog widget (such as `banner`, `table`, `stat`) through the
widget registry, next to tile, chart and stats-block widgets, and
`showWidgetActions: false` SHALL drop the Actions menu of every such widget
that does not set `showActions` itself.

#### Scenario: The PtDashboard shape

- **GIVEN** a dashboard with a stats-block, a banner, a table and a stat widget and `showWidgetActions: false`
- **WHEN** it renders
- **THEN** every widget mounts and no widget wrapper shows the Actions menu

### Requirement: A board dashboard without widget actions drops the Add footer

In the board look, when `showWidgetActions` is `false`, CnDashboardPage SHALL
pass `allowCreate: false` to a registry widget whose content has no
`allowCreate` key, and SHALL pass the widget's own `allowCreate` when it has
one. Without the board look, or with `showWidgetActions` on, the content
SHALL pass unchanged.

#### Scenario: A list card on PtDashboard

- **GIVEN** the board look, `showWidgetActions: false` and a table widget without `allowCreate`
- **WHEN** it renders
- **THEN** the widget receives `allowCreate: false` and draws no Add footer

#### Scenario: Without the board look

- **GIVEN** no board look and the same page
- **WHEN** it renders
- **THEN** the widget receives its content unchanged
