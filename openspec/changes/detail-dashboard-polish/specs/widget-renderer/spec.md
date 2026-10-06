# widget-renderer: titles, header height, install placeholder

## ADDED Requirements

### Requirement: REQ-WR-POL-001 A manifest title survives an empty content title

For a title-owning widget type, `widgetTitleOf` SHALL return the widget's top-level
`title` when `content.title` is absent, empty or whitespace.

#### Scenario: Deal widget

- **GIVEN** a widget `{ type: 'data', title: 'Deal', content: { title: '' } }`
- **WHEN** the detail page renders it
- **THEN** its heading SHALL read "Deal", not "Data"

### Requirement: REQ-WR-POL-002 Header buttons share one height

Every button in the detail page header SHALL have the same block size, and the
lifecycle bar SHALL carry no margin there.

#### Scenario: Edit next to lifecycle actions

- **GIVEN** a detail page with lifecycle actions and an Edit button
- **WHEN** the header renders
- **THEN** Edit SHALL be as tall as the other buttons

### Requirement: REQ-WR-POL-003 The install placeholder fits its tile

The "Install <app>" placeholder SHALL use `justify-content: safe center`, a compact
layout, and scroll rather than clip when the tile is too small.

#### Scenario: Two-row tile

- **GIVEN** a dashboard widget that requires a missing app in a two-row tile
- **WHEN** it renders
- **THEN** the top of the placeholder SHALL stay inside the widget
