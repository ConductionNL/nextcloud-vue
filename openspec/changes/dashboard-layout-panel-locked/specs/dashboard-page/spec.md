# dashboard-page Specification (delta)

## ADDED Requirements

### Requirement: A section the page locks stays shown

A dashboard page with `layoutPanel` SHALL accept `layoutPanelLocked`, a list of widget ids. The layout panel SHALL list
those sections with their checkbox checked and disabled and the state "Always shown"; the user MAY still move them.
Saving SHALL NOT store a locked section as hidden, and the page SHALL draw a locked section even when the user's stored
layout marks it hidden. A page without `layoutPanelLocked` SHALL behave as before.

#### Scenario: The work list cannot be switched off
- **GIVEN** My work with `layoutPanel: true` and `layoutPanelLocked: ["my-answer-today"]`
- **WHEN** the user opens Arrange page
- **THEN** "Answer today" reads "Always shown" and its checkbox cannot be cleared
- **AND** the user can still move it up or down

#### Scenario: An older record that hid a locked section
- **GIVEN** a stored layout that marks `my-answer-today` hidden, saved before the page locked it
- **WHEN** the page renders
- **THEN** "Answer today" is drawn
