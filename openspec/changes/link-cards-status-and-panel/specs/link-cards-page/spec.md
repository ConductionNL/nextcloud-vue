# link-cards-status-and-panel Delta: link-cards-page

## ADDED Requirements

### Requirement: A link card can carry a status

A card's `status` SHALL render as a pill under its description, in its tone (neutral by default). Placeholders named in
`statusValues` SHALL be filled from the fetched numbers, and `{runtime.<path>}` from the manifest runtime. A status that
still waits on a value, or whose value failed to load, SHALL NOT render; the card itself SHALL still render.

#### Scenario: A status filled from a count

- **GIVEN** a card with status "{active} active, {paused} paused" and both values as URL sources
- **WHEN** the sources answer 7 and 2
- **THEN** the card SHALL show the pill "7 active, 2 paused"

#### Scenario: A failed source hides only the status

- **GIVEN** a card whose status value source fails
- **WHEN** the page renders
- **THEN** the card SHALL render without a status pill

### Requirement: A links page can close with a panel

`config.panel` SHALL render after the groups as a card with an optional badge, paragraph and link, beside an optional
title, subtitle and list of facts. A fact whose `visibleIf` fails SHALL be left out. A panel whose `permission` or
`visibleIf` fails SHALL NOT render.

#### Scenario: The menu structure as facts

- **GIVEN** a panel with a "Menu" fact per profile, each gated on `menu.profile`, and a fact valued `{runtime.menu.modulesOn}`
- **WHEN** the runtime says the profile is simple and Sales and Products are on
- **THEN** the panel SHALL list Menu "Simple" and "Sales, Products"
