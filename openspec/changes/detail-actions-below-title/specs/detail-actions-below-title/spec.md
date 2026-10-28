## ADDED Requirements

### Requirement: A detail page can put its header buttons under the title

With `headerActionsBelow`, the board look MUST draw the detail header's buttons on a row of their own under the title, starting at the left. Without it, the buttons MUST stay on the title row.

#### Scenario: The lead page
- GIVEN the lead page with `headerActionsBelow: true`
- THEN "Woonportaal voor huurders" stands on one line and the buttons start under it
