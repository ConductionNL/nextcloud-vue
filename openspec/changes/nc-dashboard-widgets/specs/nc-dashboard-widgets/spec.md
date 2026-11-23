# nc-dashboard-widgets Delta: nc-dashboard-widgets

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [nc-dashboard-widgets](../../)

## Purpose

An app's Nextcloud Dashboard widgets are configuration, not one component and one script each.

## ADDED Requirements

### Requirement: Dashboard widgets are configuration

`registerNcDashboardWidgets(widgets, { appId })` SHALL register every widget with an id through `OCA.Dashboard.register`, and SHALL register nothing when the Dashboard is absent. Opening a widget SHALL mount `CnNcDashboardList` with its `config`, or its own `component` with its `props` and title, with the app's translate provided. `CnNcDashboardList` SHALL read OpenRegister objects or an endpoint, list at most `limit` rows with a `title` and `subtitle` template, open a row's `href` like a link, show a "View all" link, and say when the list could not be read.

#### Scenario: Open cases on the Nextcloud Dashboard

- **GIVEN** dossiq registers `dossiq_cases_overview_widget` with an OpenRegister source on `dossiq/case`
- **WHEN** the user opens the Nextcloud Dashboard
- **THEN** the widget lists the cases with their numbers, links each to its case page, and links "View all" to the Cases page
