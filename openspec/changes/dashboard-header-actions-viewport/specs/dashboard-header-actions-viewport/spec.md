# dashboard-header-actions-viewport

## ADDED Requirements

### Requirement: A dashboard's header actions can be drawn on a wide window only

A dashboard MAY set `headerActionsViewport`. With `wide` the page MUST NOT draw its header actions, its Actions menu or the buildiq square on a window under 640px; with `narrow` it MUST NOT draw them on a wider window. Without it the page MUST draw them on every window.

#### Scenario: My work on a phone

- GIVEN pipelinq's My work with `headerActionsViewport: "wide"` and a Download header action
- WHEN the page renders in a 375px window
- THEN the header shows no Download button, no Actions menu and no buildiq square

#### Scenario: My work on a computer

- GIVEN the same page
- WHEN it renders in a 1440px window
- THEN Download, the Actions menu and the buildiq square are in the header
