# index-header Delta: index-actions-menu-beside-tabs

## ADDED Requirements

### Requirement: The header actions menu can stand beside the page tabs

An index page's header Actions menu (`headerButtons[]` with `action: "actions-menu"`) SHALL stand at the end of the page tabs' row when it declares `placement: "tabs"` and the page draws page tabs, and SHALL NOT also stand in the header. Without page tabs, or without that placement, it SHALL stay in the header. A menu with nothing to list SHALL NOT be drawn in either place.

#### Scenario: Acties beside the tabs

- **GIVEN** an index page with page tabs "Taken" and "Bestemmingen" and a header Actions menu with `placement: "tabs"` that lists Refresh
- **WHEN** the page renders
- **THEN** the Actions menu stands at the end of the tabs' row and not in the header, and choosing Refresh refreshes the list

#### Scenario: No tabs

- **GIVEN** the same header Actions menu on a page without page tabs
- **WHEN** the page renders
- **THEN** the menu stands in the header
