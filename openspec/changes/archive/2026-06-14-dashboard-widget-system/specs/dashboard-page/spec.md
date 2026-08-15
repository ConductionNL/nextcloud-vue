# CnDashboardPage Specification

## Purpose

`CnDashboardPage` is a top-level dashboard page component that assembles a header, a `CnDashboardGrid`, and widget rendering with automatic widget type detection. It is the dashboard equivalent of `CnIndexPage` — a single component that handles the full dashboard page lifecycle.

---

## ADDED Requirements

### Requirement: page layout

CnDashboardPage SHALL render a page header with title and description, an optional edit toggle button, and a grid of widgets. When no widgets are in the layout, it SHALL show an empty state.

#### Scenario: header displays title and description

- GIVEN `title` is `'My Dashboard'` and `description` is `'Overview of metrics'`
- WHEN the component renders
- THEN the header shows "My Dashboard" as heading and "Overview of metrics" as description

#### Scenario: empty state shown when no layout items

- GIVEN `layout` is an empty array
- WHEN the component renders
- THEN the empty state message is displayed (default: "No widgets configured")

#### Scenario: custom empty state via slot

- GIVEN `layout` is empty and `#empty` slot is provided
- WHEN the component renders
- THEN the slot content is rendered instead of the default empty message

---

### Requirement: widget type resolution

CnDashboardPage SHALL resolve the widget type for each layout item in priority order: (1) custom scoped slot, (2) NC Dashboard API widget, (3) tile widget, (4) unknown fallback.

#### Scenario: custom widget via scoped slot

- GIVEN a widget with `id: 'kpis'` and `#widget-kpis` scoped slot is provided
- WHEN the grid renders that widget
- THEN the scoped slot content is rendered with `{ item, widget }` as slot props

#### Scenario: NC Dashboard API widget

- GIVEN a widget with `id: 'weather'` and `itemApiVersions: [1, 2]` and no `#widget-weather` slot
- WHEN the grid renders that widget
- THEN `CnWidgetRenderer` is used to render the NC Dashboard API widget

#### Scenario: tile widget

- GIVEN a widget with `id: 'link'` and `type: 'tile'` and no `#widget-link` slot and no `itemApiVersions`
- WHEN the grid renders that widget
- THEN `CnTileWidget` is used to render the tile

#### Scenario: unknown widget fallback

- GIVEN a widget with `id: 'mystery'` and no slot, no `itemApiVersions`, and `type` is not `'tile'`
- WHEN the grid renders that widget
- THEN a fallback "unknown widget" message is displayed

---

### Requirement: edit mode

CnDashboardPage SHALL support an edit mode toggle that enables drag/drop and resize on the grid.

#### Scenario: edit button toggles edit mode

- GIVEN `allowEdit` is `true`
- WHEN the user clicks the edit button
- THEN the grid becomes editable (drag/drop/resize enabled) and `@edit-toggle(true)` is emitted

#### Scenario: done button exits edit mode

- GIVEN the grid is in edit mode
- WHEN the user clicks the done button
- THEN the grid becomes read-only and `@edit-toggle(false)` is emitted

#### Scenario: edit button hidden when not allowed

- GIVEN `allowEdit` is `false`
- WHEN the component renders
- THEN no edit/done toggle button is shown

---

### Requirement: layout change propagation

CnDashboardPage SHALL forward layout changes from the grid to the parent via `@layout-change`.

#### Scenario: drag/resize emits layout change

- GIVEN the grid is in edit mode
- WHEN the user drags or resizes a widget
- THEN `@layout-change` is emitted with the updated layout array

---

### Requirement: props have safe defaults

All props SHALL have defaults so existing consumers are not broken when new props are added.

#### Scenario: minimal props render without error

- GIVEN only `widgets` and `layout` are provided
- WHEN the component renders
- THEN it uses default values for `title` ('Dashboard'), `columns` (12), `cellHeight` (80), etc.
