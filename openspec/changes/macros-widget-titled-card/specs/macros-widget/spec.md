## ADDED Requirements

### Requirement: The macros widget stands in a titled card on a card surface

The detail widget host SHALL draw a `macros` widget on a card surface inside the titled card, with the widget's manifest title and subtitle, as it does for the other content-only widgets.

#### Scenario: macros in a tab stack
- **GIVEN** a tab stack of an activity table and a `macros` widget titled "Macros"
- **WHEN** the tab opens
- **THEN** the macros SHALL stand in a card titled "Macros"
