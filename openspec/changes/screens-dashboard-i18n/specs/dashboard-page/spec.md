# dashboard-page Delta: screens-dashboard-i18n

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-dashboard-i18n](../../)

## Purpose

Draw the dashboard's period labels and a chart's manifest labels in the
user's language.

## ADDED Requirements

### Requirement: Date-range preset labels are translated

CnDashboardPage and CnDateRangePicker SHALL draw every preset label through
the host translate function, and, when the app has no translation, through
the library's own translation for the default labels ("Last 8 hours", "Last
24 hours", "Today", "Last 7 days", "Last 30 days", "Last 90 days", "Custom
range"). Any other label SHALL be drawn as written.

#### Scenario: A Dutch reader

- **GIVEN** a dashboard with the default presets and a Dutch user
- **WHEN** the period pills render
- **THEN** the pill reads "Laatste 30 dagen", not "Last 30 days"

### Requirement: Chart view labels and series names are translated

CnChartWidget SHALL draw a view's `label` and pass each series `name` to
the chart through the host translate function. A view's `series` filter SHALL
match the names as written.

#### Scenario: A view over a named series

- **GIVEN** series "Revenue" and "Margin", a view "By month" showing "Revenue", and a host translation to Dutch
- **WHEN** the view is active
- **THEN** the pill reads "Per maand" and the chart plots one series named "Omzet"
