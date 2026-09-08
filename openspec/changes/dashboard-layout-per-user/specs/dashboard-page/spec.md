# dashboard-page Delta: dashboard-layout-per-user

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [dashboard-layout-per-user](../../)

## Purpose

A user keeps their own arrangement of a manifest dashboard, on top of the
layout the admin ships. Competitor row B08 of the dossiq round 2 analysis.

## ADDED Requirements

### Requirement: Per-user layout opt-in

When a dashboard page declares `config.userLayout: true`, `CnDashboardPage`
SHALL load the current user's stored layout for that page before the first
grid render and SHALL merge it over the manifest layout. A page without the
key SHALL make no layout request and SHALL behave as before.

#### Scenario: Stored layout wins over manifest geometry

- **GIVEN** a page with `userLayout: true` and a stored record moving widget `kpis` to `x: 6`
- **WHEN** the page renders
- **THEN** `kpis` renders at `x: 6` and every widget without a stored entry renders at its manifest position

#### Scenario: Admin removal wins over the user record

- **GIVEN** a stored record for widget `old` that the manifest no longer declares
- **WHEN** the page renders
- **THEN** `old` does not render and no fallback wrapper appears for it

#### Scenario: Opt-out is inert

- **GIVEN** a dashboard page without `userLayout`
- **WHEN** it renders
- **THEN** no request to the user layout endpoint is made

@e2e include Render a dashboard page with `userLayout: true` and a seeded user record; assert the moved widget's grid position; render the same page without the key; assert no layout request.

### Requirement: User layout saved and reset

Leaving edit mode SHALL save the layout once for the current user. Dragging
SHALL NOT save. A "Reset layout" action in edit mode SHALL delete the user's
record and re-render the manifest layout.

#### Scenario: One save per edit session

- **GIVEN** edit mode with three drags
- **WHEN** the user leaves edit mode
- **THEN** exactly one PUT carries the final geometry

#### Scenario: Reset returns to the manifest

- **GIVEN** a stored user record
- **WHEN** the user chooses "Reset layout"
- **THEN** the record is deleted and the grid shows the manifest layout

@e2e include Enter edit mode, drag a widget twice, leave edit mode; assert one PUT; choose Reset layout; assert the manifest geometry.

### Requirement: User picks from the catalog and presets

In edit mode with `userLayout: true`, the add-widget picker SHALL list the
registered widget kinds marked `userAddable: true` and the presets declared in
`config.userWidgets[]`. A saved-view preset SHALL list the user's saved views
and bind the chosen one to an `object-list` widget. A tasks preset SHALL add an
`object-list` filtered to `assignee: @me`.

#### Scenario: Saved view becomes a widget

- **GIVEN** the picker and a user with a saved view "Overdue, my desk"
- **WHEN** the user adds the saved-view preset and picks that view
- **THEN** an `object-list` widget bound to that view's query and columns is added to the grid

#### Scenario: Non-addable kinds stay hidden

- **GIVEN** a registry kind without `userAddable`
- **WHEN** the picker opens
- **THEN** that kind is not listed

@e2e include Open the picker in edit mode; add the saved-view preset bound to a fixture view; assert the new widget lists that view's rows.
