## ADDED Requirements

### Requirement: A stage action can follow the open tab

A detail page SHALL draw the stage's primary action as a header button only beside the tabs its `tabs` allow and not beside the tabs its `notTabs` names; it SHALL stay reachable in the Actions menu.

#### Scenario: the AI oversight tab
- **GIVEN** a stage action "Next step" with `notTabs: ["ai-oversight"]` and a "what now" card that stands aside there too
- **WHEN** the handler opens the AI oversight tab
- **THEN** the header SHALL not show "Next step"
