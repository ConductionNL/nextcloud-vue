# dashboard-page Delta: dashboard-widget-catalog-at-boot

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-widget-catalog-at-boot](../../)

## Purpose

A registry widget kind renders on the first load of a dashboard page,
without a detail page having run first. Defect D02 and triage #3 of the
dossiq round 2 analysis.

## ADDED Requirements

### Requirement: The widget catalog is registered when a dashboard page loads

`CnDashboardPage` SHALL import the built-in dashboard widget catalog so every
registered kind resolves on its first render. The catalog modules SHALL be
declared as side effects of the package so a consumer's production build keeps
the import. A consuming app SHALL NOT need to call
`registerBuiltinDashboardWidgets()` for a built-in kind to render.

#### Scenario: Stat tile on a fresh load

- **GIVEN** a consumer build that imports `CnDashboardPage` and never imports `CnDetailPage`, and a layout item of `type: stat`
- **WHEN** the dashboard renders as the first page of the session
- **THEN** `CnStatWidget` renders and no `unavailableLabel` wrapper appears

#### Scenario: Survives a production build

- **GIVEN** the built fixture of a consumer app with tree-shaking on
- **WHEN** its dashboard chunk is inspected
- **THEN** the catalog registration module is present

@e2e include Load the app's dashboard as the first navigation in a fresh browser context; assert every `stat` tile shows a value and no tile reads "Widget not available".

### Requirement: Registration runs once

`registerBuiltinDashboardWidgets()` and the catalog import SHALL register each
kind at most once. A second call SHALL change nothing and SHALL log nothing.

#### Scenario: App still calls the helper

- **GIVEN** an app whose `main.js` calls `registerBuiltinDashboardWidgets()` and a dashboard page that imported the catalog
- **WHEN** both have run
- **THEN** the registry holds one entry per kind and no warning was logged

@e2e exclude registry bookkeeping, unit-tested via jest, no browser surface beyond the scenario above.
