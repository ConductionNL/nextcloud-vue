# tabs-widget

## ADDED Requirements

### Requirement: A widget in a tab stack follows the page controls

On a dashboard page, a widget in a tab's stack (`widgetIds`) whose
`visibleWhen` is a workspace condition (`{ workspace, op?, value? }`) on the
widget, its content or its props SHALL draw only while that condition holds
against the page workspace, and SHALL follow a change of the workspace value
without a reload. Without a page workspace, every widget of the stack SHALL
draw. The tab's count SHALL keep reading the first widget of the stack that
has a list.

#### Scenario: Chips switch the list in a tab

- **GIVEN** a tab with the stack chips, an "all" list shown for `round in ["all"]` and a "paused" list shown for `round = paused`
- **WHEN** the chips write `round = paused`
- **THEN** the tab shows the chips and the paused list, and not the "all" list

#### Scenario: The same stack off a dashboard

- **GIVEN** the same stack on a detail page, which has no workspace
- **WHEN** the tab opens
- **THEN** every widget of the stack draws
